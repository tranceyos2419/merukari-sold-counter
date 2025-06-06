import fs from "fs";
import Papa from "papaparse";
import { ProxyInput, CSVInput, CSVOutput, NameParameter } from "./interfaces";
import axios from 'axios';


//$ Read & Write utils
// Read a CSV file
export const readDataSet = (filePath: string): CSVInput[] | CSVOutput[] => {
	let parsedData: CSVInput[] | CSVOutput[] = [];
	try {
		const csvData = fs.readFileSync(filePath, "utf-8");
		parsedData = Papa.parse(csvData, {
			header: true,
			skipEmptyLines: true,
		}).data;
	} catch (err) {
		console.error(`Error reading input file: ${filePath}`, err);
	}
	console.log(`Read data from: ${filePath}`);
	return parsedData;
};

// Read JSON file for proxies
export const readProxiesJson = (filePath: string): ProxyInput[] => {
	const result = new Promise((resolve, reject) => {
		fs.readFile(filePath, "utf8", (err, data) => {
			if (err) {
				reject(`Error reading the proxies file: ${filePath} ${err}`);
				return;
			}

			try {
				const proxies = JSON.parse(data);
				resolve(proxies);
			} catch (parseError) {
				reject(
					`Error parsing JSON from proxies file: ${filePath} ${parseError}`
				);
			}
		});
	}) as unknown as ProxyInput[];
	return result;
};

// Save CSV file

export const saveData = (filePath: string, data: CSVOutput[], identity: string) => {
	try {
		// Filter out empty or invalid entries
		const filteredData = data.filter(
			(item) => item && Object.keys(item).length > 0
		);

		// Check if there is valid data to save
		if (filteredData.length === 0) {
			console.error(
				`Error: No valid data to save to ${filePath}. The data is empty or invalid.`
			);
			return;
		}

		// Convert to CSV format using PapaParse
		const finalData = Papa.unparse(filteredData);
		fs.writeFileSync(filePath, finalData);
		console.log(`${identity} | Saved data to: ${filePath}`);
	} catch (err) {
		console.log("Data is", data); // Log data for debugging purposes
		console.error(`Error saving data to: ${filePath}`, err);
	}
};

//$ Scrapping utils
export const selectRandomProxy = (arr: ProxyInput[]): ProxyInput => {
	return arr[Math.floor(Math.random() * arr.length)];
};

// helper function to wait
export const wait = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const getWaitTime = (retryCount: number) => {
	let waitTime = 5000; // wait for 5 seconds
	if (retryCount === 1) waitTime = 10000; // wait for 10 seconds
	if (retryCount === 2) waitTime = 20000; // wait for 20 seconds
	return waitTime;
}

//$ Data manipulation utils
export const getDate30DaysAgo = (): string => {
	const today = new Date();
	today.setDate(today.getDate() - 30);
	return today.toISOString().split("T")[0];
};

export const convertTimestampToDate = (timestamp: string): string => {
	const date = new Date(parseInt(timestamp, 10) * 1000);
	return date.toISOString();
};

async function getFirstRedirectURL(url: string) {
	try {
		const response = await axios.get(url, {
			maxRedirects: 0, // don't follow redirects
			validateStatus: status => status >= 200 && status < 400, // allow 3xx
		});

		if (response.status >= 300 && response.status < 400) {
			const redirectUrl = response.headers.location;

			return redirectUrl;
		} else {
			console.log('No redirect occurred. the OMURL is correct have no search_condition_id');
			return url;
		}
	} catch (error) {
		console.error('Request failed:', error.message);
		return null;
	}
}

export const createNMURL = async (omurl: string, sp: string): Promise<string> => {
	const redirectedURL = await getFirstRedirectURL(omurl);

	if (!redirectedURL) {
		throw new Error("Failed to retrieve redirect URL");
	}

	// avoid duplicating base URL
	const fullURL = redirectedURL === omurl
		? redirectedURL
		: "https://jp.mercari.com" + redirectedURL;

	const price_max = sp.toString().slice(1).replace(/,/g, "");

	const url = new URL(fullURL);
	url.searchParams.set("status", "sold_out");
	url.searchParams.set("order", "desc");
	url.searchParams.set("sort", "created_time");
	url.searchParams.set("price_max", price_max);

	return url.toString();
};


export const calculateMedian = (numbers: number[]): number => {
	const sorted = numbers.slice().sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	// check if the length of the array is zero
	if (!sorted.length) {
		return 0;
	}
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
};

export const millisToMinutes = (millis: number): string => {
	const minutes = Math.floor(millis / 60000);
	const seconds = ((millis % 60000) / 1000).toFixed(0);
	return `${minutes}:${seconds.padStart(2, "0")}`;
};

export const getName = (data: NameParameter): string => {
	return `${data.item.Identity} | ${data.item.Keyword} | SP:${data.item.SP} | MSPC:${data.MSPC} | MMP:${data.MMP.toLocaleString("ja-JP", { style: "currency", currency: "JPY", })} | Price:${data.item.Price} | TSC${data.item.Period}:${data.item.TSC}`;
};

export const createDefaultOutput = (
	item: CSVInput,
	errorMessage: string
): CSVOutput => {
	return {
		...item,
		MSC: 0,
		MMP: 0,
		NMURL: "",
		MSPC: 0,
		MWR: 0,
		MDSR: 0,
		name: "",
		switchAll: "",
		kws: "",
		kwes: "",
		pmin: 0,
		pmax: 0,
		sve: undefined,
		nickname: undefined,
		nicknameExs: undefined,
		itemStatuses: "",
		freeShipping: undefined,
		kwsTitle: "",
		kwesTitle: "",
		autoBuy: "",
		gotoBuy: "",
		type: "",
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
		memo: "",
		Error: errorMessage,
	};
};
