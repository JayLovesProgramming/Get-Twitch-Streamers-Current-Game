const puppeteer = require("puppeteer");
const notifier = require("node-notifier");

const debug = false;
const pageElementToLookFor = `[data-a-target="stream-game-link"]`;
const browserArgs = [
    "--disable-gpu",
    "--disable-setuid-sandbox",
    "--fast-start"
];

const shouldMonitor = true;
let lastGameNames = {}; // Stores previous/current game names for each streamer

function debugCode(page) {
    if (debug) {
        page.on("load", () => {
            console.log("Page loaded successfully");
        });
        page.on("response", response => {
            console.log(`Response received: ${response.url()}`);
        });
    }
}

function sendDesktopNotification(streamerName, gameName, streamerURL, lastGameNames) {
    notifier.notify({
        title: "Twitch Notifier",
        message: `${streamerName} has changed game to ${gameName} from ${lastGameNames[streamerName]}`,
        icon: "images/twitch.png",
        sound: false,
        wait: false,
        appID: "Twitch Notifier"
    }, (error, response, metadata) => {
        if (metadata.activationType === "clicked") {
            console.log("Clicked");
        }
    });
}

function checkIfGameChanged(streamerName, gameName, streamerURL, timeTaken) {
    if (debug) {
        // console.log("Checking if game has changed");
    } else if (gameName && lastGameNames[streamerName] && gameName !== lastGameNames[streamerName]) {
        console.log(`${streamerName} has changed game to: ${gameName} from ${lastGameNames[streamerName]} (${timeTaken} seconds)`);
        sendDesktopNotification(streamerName, gameName, streamerURL, lastGameNames);
    } else if (gameName && gameName !== lastGameNames[streamerName]) {
        console.log(`${streamerName} is currently streaming: ${gameName} (${timeTaken} seconds)`);
        lastGameNames[streamerName] = gameName;
    } else if (gameName && gameName === lastGameNames[streamerName]) {
        // console.log(`${streamerName} is still playing ${gameName} (${timeTaken} seconds)`);
    } else if (!gameName) {
        console.log(`${streamerName} is not streaming right now`);
    }
}

async function getStreamerGame(streamerName) {
    let startTime = Date.now();

    const streamerURL = `https://www.twitch.tv/${streamerName}`;

    const browser = await puppeteer.launch({ headless: true, args: browserArgs });
    const page = await browser.newPage();

    try {
        await page.setCacheEnabled(false);
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3");
        await page.deleteCookie(...await page.cookies());
        debugCode(page);

        await page.setRequestInterception(true);
        page.on("request", (req) => {
            if (["image", "media", "font", "xhr", "websocket", "ping", "csp_report", "manifest", "prefetch", "beacon", "imageSet"].includes(req.resourceType()) || req.url().includes("svg")) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(streamerURL, { waitForSelector: pageElementToLookFor, timeout: 15000 });
        const gameName = await page.$eval(pageElementToLookFor, element => element.textContent);
        
        const endTime = Date.now();
        const timeTaken = (endTime - startTime) / 1000;
        
        checkIfGameChanged(streamerName, gameName, streamerURL, timeTaken);

        if (!gameName) {
            console.log(`${streamerName}: No game name found`);
        }
    } catch (error) {
        if (!shouldMonitor) {
            console.log(`${streamerName} is not streaming right now`);
        }
    } finally {
        await browser.close();
    }
}

async function monitorStreamers(streamerNames, interval = 20000) {
    while (shouldMonitor) {
        await Promise.all(streamerNames.map(streamerName => getStreamerGame(streamerName)));
        await new Promise(resolve => setTimeout(resolve, interval));
    }
}

// Get the streamer names from command-line args
const streamerNames = process.argv.slice(2);
if (streamerNames.length === 0) {
    console.error("Please provide at least one streamer's name like so:");
    console.error("bun server.js [streamer1] [streamer2] ...");
    console.error("Or ");
    console.error("node server.js [streamer1] [streamer2] ...");
    process.exit(1);
}

if (shouldMonitor) {
    monitorStreamers(streamerNames);
} else {
    streamerNames.forEach(streamerName => getStreamerGame(streamerName));
}
