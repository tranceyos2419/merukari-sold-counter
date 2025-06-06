export interface ProxyInput {
	proxyURL: string;
	username: string;
	password: string;
}
export interface CSVInput {
	Keyword: string;
	Identity: string;
	OMURL: string;
	OYURL: string;
	TURL: string;
	CCURL: string;
	PURL: string;
	SP: number;
	Price: string;
	Period: number;
	TSC: number;
}
export interface CSVOutput extends CSVInput {
	MSC: number;
	MMP: number;
	NMURL: string;
	MSPC: number;
	MWR: number;
	MDSR: number;
	name: string;
	switchAll: string;
	kws: string;
	kwes: string;
	pmin: number;
	pmax: number;
	sve: void;
	nickname: void;
	nicknameExs: void;
	itemStatuses: string;
	freeShipping: void;
	kwsTitle: string;
	kwesTitle: string;
	autoBuy: string;
	gotoBuy: string;
	type: string;
	target: void;
	category: void;
	size: void;
	brand: void;
	sellerId: void;
	sellerIdExs: void;
	notificationCnt: number;
	receiveCnt: number;
	openCnt: number;
	buyCnt: void;
	buyPrice: void;
	autoBuyTryCnt: number;
	autoBuySuccessCnt: number;
	autoMoveTryCnt: number;
	autoMoveSuccessCnt: number;
	tags: string;
	memo: string;
	Error?: string;
}
// Interface for scraped item data
export interface ScrapedItem {
	id: string;
	name: string;
	price: string;
	status: string;
	updated: string;
}

export type NameParameter = {
	item: CSVInput;
	MSPC: number;
	MMP: number;
};

export interface ScrapedOMURLResult {
	MSC: number;
	prices: number[];
}

export interface ScrapeNMResult {
	MSPC: number; // Matching items based on updated date
	keyword: string; // Processed keyword
	exclusiveKeyword: string; // Processed excludeKeyword
	priceMin: number; // Minimum price
	priceMax: number; // Maximum price
}

export interface ScrapedCondition {
	keyword?: string;
	excludeKeyword?: string;
	priceMin?: string;
	priceMax?: string;
}
