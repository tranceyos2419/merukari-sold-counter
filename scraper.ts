import { Page } from "puppeteer";
import {
	ScrapedItem,
	ScrapedOMURLResult,
	ScrapeNMResult,
	ScrapedCondition,
} from "./interfaces";
import { convertTimestampToDate, getWaitTime, wait } from "./helper";
import { identity } from "puppeteer-core/lib/esm/third_party/rxjs/rxjs.js";

export const scrapeOMURL = async (
	page: Page,
	url: string,
	comparisonDate: Date,
	identity: string
): Promise<ScrapedOMURLResult> => {
	const retryLimit = 3;
	let MSC = 0;
	let prices: number[] = [];
	let retries = 0;

	const processResponse = async (response: any) => {
		try {
			// console.log(`${identity} | Processing OMURL response...`);
			if (!response) {
				throw new Error(`Response is null or undefined`);
			}

			if (response.headers()["content-length"] === "0") {
				console.warn("Empty response body detected.");
				return;
			}

			const jsonResponse = await response.json();
			if (!jsonResponse || !jsonResponse.items) {
				throw new Error(
					`Invalid response format: ${JSON.stringify(jsonResponse)}`
				);
			}

			const items: ScrapedItem[] = jsonResponse.items.filter(
				(item: ScrapedItem) => item.status === "ITEM_STATUS_SOLD_OUT"
			);

			const uniqueItems = items.filter(
				(item, index, self) => index === self.findIndex((t) => t.id === item.id)
			);

			for (const item of uniqueItems) {
				const itemUpdatedDate = new Date(convertTimestampToDate(item.updated));
				if (itemUpdatedDate >= comparisonDate) {
					MSC++;
					prices.push(parseInt(item.price ?? "0"));
				}
			}
		} catch (error) {
			console.error("Error processing OMURL response:", error);
		}
	};

	const navigateAndScrape = async (): Promise<boolean> => {
		try {
			page.on("response", async (response: any) => {
				const requestUrl = response.url();
				if (requestUrl.includes("https://api.mercari.jp/v2/entities:search")) {
					await processResponse(response);
				}
			});

			// console.log(`${identity} - Navigating to OMURL`);
			await page.goto(url, { waitUntil: "networkidle2", timeout: 500000 });

			if (MSC > 0 || prices.length > 0) {
				return true;
			}
		} catch (error) {
			const err = error.message;
			if (
				err.includes("detached Frame") ||
				err.includes("frame was detached")
			) {
				console.warn(`Frame was detached during navigation, retrying...`);
			} else {
				console.error(`Error during navigation attempt ${retries + 1}:`, error);
			}
		}
		return false;
	};

	while (retries < retryLimit) {
		const success = await navigateAndScrape();
		if (success) {
			// console.log(`${identity} | OMURL scraping completed successfully.`);
			break;
		}

		retries++;
		const waitTime = getWaitTime(retries);
		if (retries >= retryLimit) {
			console.error(`${identity} | Failed to scrape OMURL ${retryLimit} attempts.`);
		} else {
			console.warn(`${identity} | Retrying OMURL scrape (${retries}/${retryLimit})...`);
			await wait(waitTime)
		}
	}
	return { MSC, prices };
};

export const scrapeNMURL = async (
	page: Page,
	NMURL: string,
	comparisonDate: Date,
	identity: string
): Promise<ScrapeNMResult> => {
	let MSPC = 0;
	let keyword = "";
	let exclusiveKeyword = "";
	let priceMin = 0;
	let priceMax = 0;

	const retryLimit = 3; // Maximum retry attempts
	let retries = 0;

	const processResponse = async (response: any) => {
		try {
			// console.log(`${identity} | Processing NMURL response...`);
			if (!response) {
				throw new Error("Response object is null or undefined.");
			}

			if (response.headers()["content-length"] === "0") {
				console.warn("Received empty response.");
				return;
			}

			let jsonResponse: any;
			try {
				const text = await response.text();
				jsonResponse = JSON.parse(text);
			} catch (error) {
				throw new Error(`Failed to parse response JSON: ${error.message}`);
			}

			if (!jsonResponse || typeof jsonResponse !== "object") {
				throw new Error("Unexpected JSON format or null JSON.");
			}

			if (!Array.isArray(jsonResponse.items)) {
				throw new Error("Missing or invalid 'items' array in JSON.");
			}

			const items: ScrapedItem[] = jsonResponse.items.filter(
				(item: ScrapedItem) => item.status === "ITEM_STATUS_SOLD_OUT"
			);

			const uniqueItems = items.filter(
				(item, index, self) => index === self.findIndex((t) => t.id === item.id)
			);

			for (const item of uniqueItems) {
				const itemUpdatedDate = new Date(convertTimestampToDate(item.updated));
				if (itemUpdatedDate >= comparisonDate) {
					MSPC += 1;
				}
			}

			const scrapedCondition = jsonResponse.searchCondition as ScrapedCondition;
			if (scrapedCondition) {
				keyword = scrapedCondition.keyword
					? scrapedCondition.keyword
						.split(" ")
						.filter((part) => part.trim() !== "")
						.join(",")
					: "";
				exclusiveKeyword = scrapedCondition.excludeKeyword
					? scrapedCondition.excludeKeyword
						.split(" ")
						.filter((part) => part.trim() !== "")
						.join("|")
					: "";
				priceMin = parseInt(scrapedCondition.priceMin ?? "0", 10);
				priceMax = parseInt(scrapedCondition.priceMax ?? "0", 10);
			}
		} catch (error) {
			console.error(`Error during NMURL response processing: ${error.message}`);
		}
	};

	const navigateAndScrape = async (): Promise<boolean> => {
		try {
			page.on("response", async (response: any) => {
				try {
					const requestUrl = response.url();
					if (
						requestUrl.includes("https://api.mercari.jp/v2/entities:search")
					) {
						await processResponse(response);
					}
				} catch (error) {
					console.error(
						`Error during response handling for NMURL: ${error.message}`
					);
				}
			});

			// console.log(`${identity} | Navigating to NMURL`);
			await page.goto(NMURL, {
				waitUntil: "networkidle2",
				timeout: 500000,
			});

			if (keyword || priceMax || exclusiveKeyword) {
				// console.log(`${identity} - Scraping NMURL successful`);
				return true;
			} else {
				console.warn("No valid data found for NMURL.");
				return false;
			}
		} catch (error) {
			if (error.message.includes("detached Frame")) {
				console.warn(`Frame was detached during NMURL navigation, retrying...`);
			} else {
				console.error(`Error during NMURL navigation: ${error.message}`);
			}
			return false;
		}
	};

	while (retries < retryLimit) {
		try {
			const success = await navigateAndScrape();
			if (success) {
				// console.log(`${identity} | NMURL scraping completed successfully.`);
				break;
			}
		} catch (error) {
			console.log(`Search Condition is null ${retries + 1}: ${error.message}`);
		}

		retries++;
		const waitTime = getWaitTime(retries);
		if (retries >= retryLimit) {
			console.error(`${identity} | Failed to scrape NMURL ${retryLimit} attempts.`);
		} else {
			console.warn(`${identity} | Retrying NMURL scrape (${retries}/${retryLimit})...`);
			await wait(waitTime)
		}
	}

	return { MSPC, keyword, exclusiveKeyword, priceMin, priceMax };
};
