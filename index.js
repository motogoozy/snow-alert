const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config.json'));

const checkInterval = 24; //hours
const milliseconds = checkInterval * 60 * 60 * 1000;

const getWeather = () => {
	return new Promise(async (resolve, reject) => {
		const city = 'Spanish Fork';
		const state = 'UT';
		const country = 'US';
		const key = config.apiKey;
		const url = `https://api.weatherbit.io/v2.0/forecast/hourly?city=${city}&state=${state}&country=${country}&key=${key}&hours=48`;
		let res = await axios.get(url);
		let hourlyData = res.data.data;
	
		let snowPredicted = false;
		let snowDepth = 0;
		let firstDate = '',
			firstDay = '',
			lastDay = '',
			firstTime = '',
			lastTime = '',
			firstAmOrPm = '',
			lastAmOrPm = '';
	
		hourlyData.forEach(forecast => {
			if (forecast.snow > 0) {
				snowPredicted = true;
				let depth = forecast.snow_depth / 25.4; // converting millimeters to inches
				let date = new Date(forecast.timestamp_local);
				hour = date.getHours();
				day = date.toDateString();
				if (hour <= 11) {
					if (hour === 0) {
						hour = 12;
					}
					amOrPm = 'A.M.';
				} else {
					if (hour !== 12) {
						hour = hour - 12;
					}
					amOrPm = 'P.M.';
				}
				let time = hour + ':00'
	
				if (firstDate === '') {
					firstDate = date;
					firstDay = day;
					firstTime = hour;
					firstAmOrPm = amOrPm;
				}
				if (date < firstDate) {
					firstDay = day;
					firstTime = time;
					firstAmOrPm = amOrPm;
				}
				lastDay = day;
				lastTime = time;
				lastAmOrPm = amOrPm;
				snowDepth = depth;
			}
		});
	
		if (snowPredicted && snowDepth >= 0.5) {
			snowDepth = snowDepth.toFixed(2);
			let message = `Forecast: Snow expected to start around ${firstTime} ${firstAmOrPm} on ${firstDay} and will continue until around ${lastTime} ${lastAmOrPm} on ${lastDay}. Total expected snowfall is ${snowDepth} inches`;
			
			console.log('Snow forecasted. Sending alert to recipients...')
			let alertStatus = await sendAlert(message);
			console.log(alertStatus);
		} else if (snowPredicted && snowDepth < 0.5) {
			console.log('---')
			console.log('Less than a half inch of snow predicted.');
		} else {
			console.log('---')
			console.log('No snow predicted');
		}
		resolve('Snow monitoring is active...');
	})
};

const sendAlert = (message) => {
	const emails = config.emails;
	return new Promise((resolve, reject) => {
		let transporter = nodemailer.createTransport({
			host: "smtp-mail.outlook.com",
			secure: false,
			port: 587, // default port for insecure
			auth: {
			user: "kspayne93@outlook.com",
			pass: config.password
			}
		});
		
		let mailOptions = {
			from: '"Weather Alert" <kspayne93@outlook.com',
			to: emails,
			subject: 'Snow Alert',
			text: message
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				reject(error);
			}
			// console.log(info);
			resolve('Message(s) sent successfully.');
		});
	})
}

console.log('Started Weather Alert service...');

// Run once on startup
// console.log('Fetching weather forecast...');
// getWeather().then(res => {
// 	console.log(res);
// })

// checks weather forecast every 12 hours
setInterval(async () => {
	console.log('Fetching weather forecast...');
	let result = await getWeather();
	console.log(result)
}, milliseconds);