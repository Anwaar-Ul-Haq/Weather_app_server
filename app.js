const http = require("http");
const url = require("url");
const { MongoClient } = require("mongodb");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const hostname = process.env.YOUR_HOST || "0.0.0.0";
// const port = process.env.PORT || 4000;

//! call weather forcast api
const baseURL = "https://api.openweathermap.org/data/2.5/forecast";

const fetchWeather = async (data) => {
  const { city, longitude, latitude, cnt } = data;
  try {
    return await axios({
      method: "GET",
      baseURL,
      params: {
        q: city && city,
        lat: latitude && latitude,
        lon: longitude && longitude,
        units: "metric",
        appid: "d466802093fc509a336c3a999a4005bf",
        cnt: cnt && cnt,
      },
    });
  } catch (error) {
    console.log("Error -:", error);
  }
};

//! setup database
// mongo db url
const uri =
  "mongodb+srv://anwaar:Anwaar12345@cluster0.6a4ug9c.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
//db is mongodb database name name && collection is mongodb collection name
const dbConnect = async () => {
  let result = await client.connect();
  result = client.db("weather_forcast_db").collection("weather_forcast");
  return result;
};

//! create record in db
const createRecord = async (weatherResult, location) => {
  let result = await dbConnect();
  await result.insertOne({ weatherResult, location });
};

//! creart server
const server = http.createServer((req, res) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  ); /* @dev First, read about security */
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
  res.setHeader("Access-Control-Max-Age", 2592000); // 30 days

  const params = url.parse(req.url, true).query;
  const pathname = url.parse(req.url, true).pathname;

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/api") {
    const handleDb = async () => {
      let data = await dbConnect();
      data = await data.find({}).toArray();
      res.write(JSON.stringify(data));
      res.end();
    };
    handleDb();
  } else if (req.url === "/") {
    fs.readFile(
      path.join(__dirname, "public", "index.html"),
      (err, content) => {
        if (err) throw err;
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(content);
      }
    );
  } else if (req.url === "/style.css") {
    fs.readFile(path.join(__dirname, "public", "style.css"), (err, content) => {
      if (err) throw err;
      res.writeHead(200, { "Content-Type": "text/css" });
      res.end(content);
    });
  }
  const images = [
    "bit.jpeg",
    "ca.jpeg",
    "hub.png",
    "jira.jpeg",
    "linkedin.png",
    "Logo.png",
    "UNHLogo.png",
    "writesea.png",
  ];
  for (const image of images) {
    if (req.url === `/Images/${image}`) {
      fs.readFile(
        path.join(__dirname, "public/Images", image),
        (err, content) => {
          if (err) console.log(err);;

          res.writeHead(200, { "Content-Type": `image/${image.split(".")[1]}` });
          res.end(content);
        }
      );
    }
  }
  if (pathname === "/forcast") {
    const getForcast = async () => {
      const data = await fetchWeather({
        city: params?.city,
        longitude: params?.longitude,
        latitude: params?.latitude,
        // cnt: params?.ctn,
      });
      const days = [0, 1, 2, 3, 4];
      let weatherResult = [];
      for (const day of days) {
        let currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + day);
        const dailyWeather =
          data?.data &&
          data.data.list.find(
            (x) =>
              new Date(x.dt_txt).getDate() === new Date(currentDate).getDate()
          );
        weatherResult.push(dailyWeather);
      }
      if (data?.data) await createRecord(weatherResult, data?.data?.city);
      res.write(JSON.stringify({ weatherResult, location: data?.data?.city }));
      res.end();
    };
    getForcast();
  }
  if (pathname === "/hourly-forcast") {
    (async () => {
      const horulyForcastData = await fetchWeather({
        city: params?.city,
        longitude: params?.longitude,
        latitude: params?.latitude,
        cnt: params?.ctn,
      });
      res.write(
        JSON.stringify({ hourlyForcast: horulyForcastData?.data?.list })
      );
      res.end();
    })();
  }
});

server.listen(process.env.PORT || 4000, hostname, () => {
  console.log(
    `Server running at http://${hostname}:${process.env.PORT || 4000}/`
  );
});
