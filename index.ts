import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

import {
  readDataSet,
  readProxiesJson,
  saveData,
  getDate30DaysAgo,
  createNMURL,
  calculateMedian,
  millisToMinutes,
  getName,
  createDefaultOutput,
} from "./helper";
import { CSVInput, CSVOutput, ProxyInput } from "./interfaces";
import { scrapeOMURL, scrapeNMURL } from "./scraper";
import { initializeCluster, setupClusterPage, closeCluster } from "./browser";
import { sendEmailWithRetry } from "./emailer";

dotenv.config();

const INPUT_FILE_PATH = path.join(process.cwd(), "input.csv");
const OUTPUT_FILE_PATH = path.join(process.cwd(), "output.csv");
const PROXIES_FILE_PATH = path.join(process.cwd(), "proxies.json");

(async () => {
  console.log("Scraping application starting...");
  const startTime = performance.now();
  const date30daysBefore = getDate30DaysAgo();
  const comparisonDate = new Date(date30daysBefore);

  let inputDataSet: CSVInput[] = [];
  let outputDataSet: CSVOutput[] = [];

  try {
    inputDataSet = readDataSet(INPUT_FILE_PATH) as CSVInput[];
    outputDataSet = readDataSet(OUTPUT_FILE_PATH) as CSVOutput[];
    const proxiesDataSet: ProxyInput[] = readProxiesJson(PROXIES_FILE_PATH);
    // opening 8 tab concurrently depend on your pc performance make it higher or lower
    const cluster = await initializeCluster(10);

    await cluster.task(async ({ page, data }) => {
      const { item, comparisonDate, proxiesDataSet, rowIndex } = data;
      const selectedProxy = proxiesDataSet.length
        ? proxiesDataSet[rowIndex % proxiesDataSet.length]
        : undefined;

      if ((outputDataSet?.[rowIndex]?.Identity ?? "") === item?.Identity) {
        console.log(
          `${item?.Identity} (Row ${rowIndex + 1}) | Skipping this item`,
        );
        return;
      }

      if (!inputDataSet?.[rowIndex]?.OMURL?.includes("jp.mercari.com/search")) {
        console.log(
          `${item?.Identity} (Row ${rowIndex + 1}) | Skipping this item`,
        );
        outputDataSet[rowIndex] = createDefaultOutput(item, "Invalid OMURL");
        return;
      }

      await setupClusterPage(page, selectedProxy);

      console.log(
        `${item?.Identity} (Row ${rowIndex + 1}) | Processing starts`,
      );

      let MSC = 0;
      let MSPC = 0;
      let MMP = 0;
      let TSC = item.Period === 90 ? item.TSC / 3 : item.TSC;
      let prices: number[] = [];
      let keyword = "";
      let exclusiveKeyword = "";
      let priceMin = 0;
      let priceMax = 0;

      const NMURL = await createNMURL(item.OMURL, item.SP);

      try {
        const NMResult = await scrapeNMURL(
          page,
          NMURL,
          comparisonDate,
          item.Identity,
        );
        if (NMResult) {
          MSPC = NMResult.MSPC;
          keyword = NMResult.keyword;
          exclusiveKeyword = NMResult.exclusiveKeyword;
          priceMin = NMResult.priceMin;
          priceMax = NMResult.priceMax;
        }

        const OMResult = await scrapeOMURL(
          page,
          item.OMURL,
          comparisonDate,
          item.Identity,
        );
        if (OMResult) {
          MSC = OMResult.MSC;
          prices = OMResult.prices;
        }

        MMP = calculateMedian(prices);

        const MWR =
          isNaN(MSPC / MSC) || !isFinite(MSPC / MSC)
            ? 0
            : Number((MSPC / MSC).toFixed(2));
        const MDSR =
          isNaN(MSPC / TSC) || !isFinite(MSPC / TSC)
            ? 0
            : Number((MSPC / TSC).toFixed(2));

        const nameParameters = {
          item: item,
          MSPC: MSPC,
          MMP: MMP,
        };

        const name = getName(nameParameters);

        // Limit PriceMax under MMP (skip in the case of no data for MMP)
        priceMax = priceMax >= MMP && MMP != 0 ? MMP : priceMax;

        const memo = `${item.OMURL} ${item.OYURL} ${item.TURL} ${item.CCURL} ${item.PURL}`;

        const outputData: CSVOutput = {
          ...item,
          MSC,
          MMP,
          NMURL,
          MSPC,
          MWR,
          MDSR,
          name: name,
          switchAll: "TRUE",
          kws: keyword,
          kwes: exclusiveKeyword,
          pmin: priceMin,
          pmax: priceMax,
          sve: undefined,
          nickname: undefined,
          nicknameExs: undefined,
          itemStatuses: "2,3,4,5",
          freeShipping: undefined,
          kwsTitle: keyword,
          kwesTitle: exclusiveKeyword,
          autoBuy: "FALSE",
          gotoBuy: "FALSE",
          type: "normal",
          target: undefined,
          category: undefined,
          size: undefined,
          brand: undefined,
          sellerId: undefined,
          sellerIdExs: undefined,
          notificationCnt: 0,
          receiveCnt: 0,
          openCnt: 0,
          buyCnt: undefined,
          buyPrice: undefined,
          autoBuyTryCnt: 0,
          autoBuySuccessCnt: 0,
          autoMoveTryCnt: 0,
          autoMoveSuccessCnt: 0,
          tags: item.Identity,
          memo: memo,
        };

        outputDataSet[rowIndex] = outputData;
        saveData(OUTPUT_FILE_PATH, outputDataSet, item.Identity);
        console.log(`${item?.Identity}(Row ${rowIndex + 1}) | Processing ends`);
      } catch (error) {
        console.error(
          `${item?.Identity} (Row ${rowIndex + 1}) | Error:`,
          error,
        );
      }
    });

    for (let index = 0; index < inputDataSet.length; index++) {
      const item = inputDataSet[index];
      await cluster.queue({
        item,
        comparisonDate,
        proxiesDataSet,
        rowIndex: index,
      });
    }
    await cluster.idle();
    await closeCluster();

    console.log("Scraping complete. Sending email...");
    await sendEmailWithRetry({
      recipient: process.env.RECIPENT_EMAIL || "",
      subject: "Scraping Results: Your Requested Data",
      attachmentPath: OUTPUT_FILE_PATH,
      isError: false,
    });
  } catch (error) {
    console.error("Error during the scraping process:", error);
    console.log("Sending error email...");
    await sendEmailWithRetry({
      recipient: process.env.RECIPENT_EMAIL || "",
      subject: "Scraping Error: Notification",
      isError: true,
    });
  } finally {
    const endTime = performance.now();
    if (inputDataSet.length !== outputDataSet.length) {
      console.error("Row count mismatch between input and output!");
      throw new Error(
        "Output file generation failed due to row count mismatch.",
      );
    }
    console.log(
      `Execution took ${millisToMinutes(endTime - startTime)} minutes.`,
    );
  }
})();
