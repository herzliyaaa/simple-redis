import express from 'express';
import axios from 'axios';
import ioredis from 'ioredis';

const { createClient } = ioredis;

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.PORT || 6379;

const client = createClient(REDIS_PORT);


client.on('connect', () => {
    console.log('redis connected');
});

const app = express();

// Set response
function setResponse(username, repos) {
    return `<h2>${username} JSON fetched from cache</h2> <p>${repos}</p> `;
}

// Make request to api for data
async function getRepos(req, res, next) {
    try {
        console.log('Fetching Data...');

        const { username } = req.params;
        // https://dummyjson.com/posts/search?q=in
        const response = await axios.get(`https://dummyjson.com/posts/search?q=${username}`);
        const data = await response.data;

        const repos = JSON.stringify(data);
        console.log(repos);

        
        // Set data to Redis
        client.setex(username, 3600, repos);

        res.send(setResponse(username, repos));
    } catch (err) {
        console.error(err);
        res.status(500);
    }
}

// Cache middleware
function cache(req, res, next) {
    const { username } = req.params;

    client.get(username, (err, data) => {
        if (err) throw err;

        if (data !== null) {
            res.send(setResponse(username, data));
        } else {
            next();
        }
    });
}

app.get('/repos/:username', cache, getRepos);

app.listen(5000, () => {
    console.log(`App listening on port ${PORT}`);
});