# Forum Real-time

Real time forum with a Pub/Sub architecture

## Installation

```bash
npm install
```
## Start

```bash
docker-compose up 
```

after the db is up and running, start the server with:

```bash
npm start
```

open in: http://localhost:8080 or http://<IP_ADDRESS>:8080
## Requirements

### MySQL Database
If you want to run this project, you need to have a MySql database. 
Be sure to link the database updatating the url on the file `server/database/db.js` with your database credentials.

### Docker
this project uses docker-compose. be sure to set the right credentials on the `docker-compose.yml` file for the mysql service.