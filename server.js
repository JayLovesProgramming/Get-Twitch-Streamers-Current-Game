const puppeteer = require("puppeteer");

const pageElementToLookFor = `[data-a-target="stream-game-link"]`;
const browserArgs = [
    "--disable-gpu", // Disables GPU acceleration
    "--disable-setuid-sandbox", // Disables the setuid sandbox. Applies to Linux Chromium sandbox
    "--fast-start" // Runs the chromium process in fast mode to hopefully reduce loading times
]

async function getStreamerGame(streamerName) {
    let startTime = Date.now();

    const streamerURL = `https://www.twitch.tv/${streamerName}`;

    // Launch a headless browser
    const browser = await puppeteer.launch({ headless: true, args: browserArgs });
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    try 
    {
        await page.setRequestInterception(true); // This is required to intercept the request in order to attempt a quicker response
        page.on("request", (req) => { // Intercept the request before attempting to load the page
            if (["image", "media", "font"].includes(req.resourceType())) {
                req.abort(); // Block images/videos and font from the request to decrease loading times
            }
            else
            {
                req.continue();
            }
        })

        await page.goto(streamerURL, { waitForSelector: pageElementToLookFor, timeout: 7500 }); // Go to the streamers page and wait for the specified element (It shouldn't take longer than 7.5 seconds to load)
        const gameName = await page.$eval(pageElementToLookFor, element => element.textContent); // Fetch the game name when it's available to us
        

        const endTime = Date.now();
        const timeTaken = (endTime - startTime) / 1000; // Convert to ms

        if (gameName)
        {
            console.log(`${streamerName} is currently streaming: ${gameName} (${timeTaken} seconds)`);
        }
        else
        {
            console.log(`${streamerName} is not streaming right now or no game name found`);
        }
    }
    catch (error)
    {
        // console.error(`Error getting game name for streamer ${streamerName}`, error);
        console.log(`${streamerName} is not streaming right now or no game name found`);
    }
    finally
    {
        await browser.close(); // Close the browser
    }
}

// Get the streamer name from the comamnd-line args
const streamerName = process.argv[2];
if (!streamerName)
{
    console.error("Please provide a streamers name like so:");
    console.error("pnpm server.js [streamers name]");
    console.error("npm server.js [streamers name]");
    console.error("bun server.js [streamers name]");
    process.exit(1);
};

getStreamerGame(streamerName);
