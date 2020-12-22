const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config.json'));
const axios = require('axios');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();

const { OUTLOOK_EMAIL, OUTLOOK_PW, API_KEY } = process.env;

(async function main() {
  const cronTime = '0 20 * * *'; //8:00 PM

  console.log('Started weather alert service.');

  cron.schedule(cronTime, async () => {
    console.log('Fetching weather forecast...');

    let today = new Date().toDateString();

    try {
      let forecast = await getForecast();
      let snowDepth = forecast.snow / 25.4; // mm to in

      if (snowDepth >= 0) {
        let msg = `${today} - ${snowDepth.toFixed(2)} in. of snowfall expected tomorrow.`;
        console.log(msg);

        try {
          let res = await sendAlert(`\n\n${msg}`);
          console.log(res);
        } catch (err) {
          console.log(`Error sending alert: ${err}`);
        }
      } else {
        console.log(`No snow predicted.`);
      }
    } catch (err) {
      let errMsg = err.response?.data?.error || 'Unknown error';
      let msg = `${today} - Error retrieving data: ${errMsg}`;
      console.log(msg);
    }

    console.log('\n');
  });
})();

async function getForecast() {
  const city = 'Spanish Fork';
  const state = 'UT';
  const country = 'US';
  const url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&state=${state}&country=${country}&key=${API_KEY}&hours=48`;

  let res = await axios.get(url);
  return res.data.data[0];
}

function sendAlert(message) {
  const { emails } = config;

  console.log('Sending alert(s)...');
  return new Promise((resolve, reject) => {
    let transporter = nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      secure: false,
      port: 587, // default port for insecure
      auth: {
        user: OUTLOOK_EMAIL,
        pass: OUTLOOK_PW,
      },
    });

    let mailOptions = {
      from: '"goozybot" <goozybot@outlook.com',
      to: emails,
      subject: 'Snow Alert',
      text: message,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        let errMsg = err.response || 'Unknown error';
        reject(`Error sending email alert(s) - ${errMsg}`);
      } else {
        resolve('Alert(s) sent successfully.');
      }
    });
  });
}
