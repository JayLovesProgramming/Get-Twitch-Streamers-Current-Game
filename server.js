const puppeteer = require("puppeteer");

const pageElementToLookFor = `[data-a-target="stream-game-link"]`;

async function getStreamerGame(streamerName) {
    const streamerURL = `https://www.twitch.tv/${streamerName}`;

    // Launch a headless browser
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try 
    {
        await page.goto(streamerURL); // Go to the streamers page
        await page.waitForSelector(pageElementToLookFor); // Wait for the game name to be available
        const gameName = await page.$eval(pageElementToLookFor, element => element.textContent); // Fetch the game name when it's available to us

        if (gameName)
        {
            console.log(`${streamerName} is currently streaming: ${gameName}`);
        }
        else
        {
            console.log(`${streamerName} is not streaming right now or no game name found`);
        }
    }
    catch
    {
        console.error(`Error getting game name for streamer ${streamerName}`, error);
    }
    finally
    {
        await browser.close(); // Close the browser
    }
}

getStreamerGame("angryginge13")
