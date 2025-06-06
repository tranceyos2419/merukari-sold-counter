# Merukari Sold Counter

## This is an on-going project. Some features might already have been implemented. Please look at \*.ts files to know the current state

Scrapping data on Merukari and export a CSV file<br>
➡️ Website to scrapse: [Merukari](https://jp.mercari.com)

# Contents

- [Specification](#Specification)
- [Branch](#branch)
- [Installation](#installation)
- [Development setup](#development-setup)
- [External Tools](#external-tools)
- [Reference](#reference)
- [Future work](#future-work)

# Specification

## Attributes

[Input]

- Keyword: Description of items
- Identity: Unique Key
- OMURL: URL contains sold data of a specific item on Merukari
- OYURL: URL contains sold data of a specific item on Yahoo Auction
- ECURL: URL contains listed items in the cheapest order on eBay
- SP: Price to source (Sourcing price)
- Price: Price that is used to calculate SP
- Period: The period of calculating Price and TSC
- TSC: The number of items sold on eBay in the last 30 days

[output]

- MSC: The number of sold items on OMURL in the last 30 days
- MMP: The median of sold items on OMURL in the last 30 days
- NMURL: URL contains sold data of a specific item under SP
- MSPC: The number of sold items on NMURL in the last 30 days
- MWR: The ratio of sold items under SP (MSPC / MSC)
- MDSR: The ratio of demand (TSC) and supply (MSPC) (MSPC / TSC)

## Flowcharts

![Merukari Sold Counter - v1 3 0 drawio](https://github.com/user-attachments/assets/2deba228-7a4e-4e02-8f4c-92803dff9eb9)

## Explanation videos

### [Explanation video 01](https://youtu.be/OArhNWXB8QE) <br>

## Examples I/O files

### [Example file 01](https://docs.google.com/spreadsheets/d/1SaieguLxp8nrFzjSr-qKWCcD1woiba4h2VKBL_SipwY/edit?usp=sharing)<br>

# Branch

Please develop features on feature/[name] branches and merge them into the dev branch. <br>
Please leave a comment to describe what you did to each commit

> master : for the production
>
> > doc : for editing README.md <br>
> > dev : for developing the app <br>
> >
> > > feature/[name] : for developing individual features <br>
> > > bugfix/[name] : for fixing bugs

# Installation

Make sure you have node.js, and pnpm installed locally, and type the bash script in the project folder to install dependencies

```bash
pnpm i
```

# Development Setup

###### Make sure you have done installation and configuration

Run typescript compiler from npm script

```bash
pnpm run start
```

# External tools

### Proxy solutions

- [Smartproxy](https://smartproxy.com/)

# Reference

### entities:search

#### items

![Merukari-List-Item-JSON](https://github.com/user-attachments/assets/9d0bbbfe-4186-442c-9a9a-e05f070bc35a)

#### searchCondition

![CleanShot 2024-10-26 at 19 22 42@2x](https://github.com/user-attachments/assets/d89c9333-e1dc-4216-a820-7f35f5d937af)

# Future Work

- Fixing an issue that MSC becomes 0 after running more than about 100 rows
- Increasing the accuracy of MSC (Currently the inaccuracy is +-0 ~ 3)
- Merukari: Use jut only one browser and pre for scrapping -> page.close()
