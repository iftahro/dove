import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

const fetchPageAndExtractData = async () => {
    const { MY_EMAIL: email, MY_API_KEY: apiKey, MY_PASS: pass, MY_URL: targetUrl, MY_PRICE_LIMIT: priceLimitStr } = process.env;
    const priceLimit = parseFloat(priceLimitStr);
    let emailed = false;
    let price, discountPrice;
    try {
        // const response = await axios.get(`http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&render=true`);
        const response = await axios.get(targetUrl);
        const $ = cheerio.load(response.data);
        const firstPriceElement = $('.price-container').first();
        price = parseFloat(firstPriceElement[0].children[1].attribs['data-price']);
        discountPrice = parseFloat(firstPriceElement[0].children[1].attribs['data-discountprice']);
    } catch (error) {
        throw new Error('Error scraping the page');
    }

    if (price <= priceLimit || discountPrice <= priceLimit) {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: email, pass }
            });
            await transporter.sendMail({
                from: email,
                to: email,
                subject: 'Dove price went down',
                text: `The price is now ${price} and discount is ${discountPrice}`
            });
            emailed = true;
        } catch (error) {
            throw new Error('Error sending email');
        }
    }
    return { price, discountPrice, emailed };
};

app.get('/scrape-and-send', async (req, res) => {
    try {
        const { price, discountPrice, emailed } = await fetchPageAndExtractData();
        res.status(200).json({
            message: 'Scraping successfully!',
            price,
            discountPrice,
            emailed
        });
    } catch (error) {
        res.status(500).send(error.message); // Directly send the error message to the client
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
