import express from "express";
import axios from "axios";
import ioredis from "ioredis";
import morgan from "morgan";

const { createClient } = ioredis;

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.PORT || 6379;

const client = createClient(REDIS_PORT);

client.on("connect", () => {
  console.log("Redis connected");
});

client.on("error", (err) => {
  console.log("Error " + err);
});

const app = express();

// Set response
function setResponse(query, results) {
  return `<h1>Query: ${query}</h1><h2>JSON fetched from Cache</h2> <code>${results}</code> `;
}

function setClearResponse(query, keys) {
  return `<h1>Key ${query} is cleared.</h1> <br/> <h2>Keys remaining: ${keys}</h2>`;
}

// Make request to api for data and Set key with its value
async function getResults(req, res, next) {
  try {
    console.log("Fetching Data...");

    const { query } = req.params;
    const response = await axios.get(
      `https://dummyjson.com/posts/search?q=${query}`
    );
    const data = await response.data;
    const results = JSON.stringify(data);

    // Set data to Redis
    client.setex(query, 3600, results);
    res.send(setResponse(query, results));

    const keys = await client.keys("*");

    console.log("keys:", keys);

  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

// Clear key by query
async function clearCache(req, res, next) {
  try {
    const { query } = req.params;
    client.del(query);
    const keys = await client.keys("*");
    res.send(setClearResponse(query, keys));
  } catch (err) {
    console.log(err);
    res.status(400);
  }
}

// Cache middleware
function cache(req, res, next) {
  const { query } = req.params;
  client.get(query, (err, data) => {
    if (err) throw err;
    if (data !== null) {
      res.send(setResponse(query, data));
    } else {
      next();
    }
  });
}

app.use(morgan("dev"));
app.get("/results/:query", cache, getResults);
app.get("/results/clear-cache/:query", clearCache);

app.listen(5000, () => {
  console.log(`App listening on port ${PORT}`);
});
