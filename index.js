#!/usr/bin/env node

const config = require('./config.json');
const axios = require('axios');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.ENV') });

const { OUTLOOK_EMAIL, OUTLOOK_PW, API_KEY } = process.env;

(async function main() {
  console.log('Started weather alert service.');

  const cronTime = '0 20 * * *'; //8:00 PM

  cron.schedule(cronTime, async () => {
    const today = new Date().toDateString();
    console.log(today);

    try {
      const forecast = await getForecast();
      const snowDepth = forecast.snow / 25.4; // mm to in

      if (snowDepth >= 1) {
        const msg = `${snowDepth.toFixed(2)} in. of snowfall expected tomorrow.`;
        console.log(msg);

        try {
          const res = await sendAlert(`\n\n${msg}\n\n - goozybot`);
          console.log(res);
        } catch (err) {
          console.log(`Error sending alert: ${err}`);
        }
      } else if (snowDepth < 1 && snowDepth > 0) {
        console.log('Less than 1 inch of snow predicted');
      } else {
        console.log(`No snow predicted.`);
      }
    } catch (err) {
      const errMsg = err.response.data.error || 'Unknown error';
      console.log(`Error retrieving data: ${errMsg}`);
    }

    console.log('\n');
  });
})();

async function getForecast() {
  const city = 'Spanish Fork';
  const state = 'UT';
  const country = 'US';
  const url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&state=${state}&country=${country}&key=${API_KEY}&hours=48`;

  const res = await axios.get(url);
  return res.data.data[0];
}

function sendAlert(message) {
  const { emails } = config;

  console.log('Sending alert(s)...');
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      secure: false,
      port: 587, // default port for insecure
      auth: {
        user: OUTLOOK_EMAIL,
        pass: OUTLOOK_PW,
      },
    });

    const mailOptions = {
      from: '"goozybot" <goozybot@outlook.com',
      to: emails,
      subject: 'Snow Alert',
      text: message,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        const errMsg = err.response || 'Unknown error';
        reject(`Error sending email alert(s) - ${errMsg}`);
      } else {
        resolve('Alert(s) sent successfully.');
      }
    });
  });
}
