const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "database.db");
let db = null;
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(5000, () => {
      console.log(
        "Database initialized successfully and server started at http://localhost:5000"
      );
    });
  } catch (e) {
    console.log("Failed to start server and initialise database");
    console.log(e);
    process.exit(1);
  }
};

initializeDBandServer();

const authenticateToken = (request, response, next) => {
  const authHeaders = request.headers;
  if (authHeaders === undefined) {
    console.log("jwt is undefined");
    response.send("Unauthorised  from middleware jwt is undefined");
    response.status(401);
  } else {
    console.log(authHeaders);
    const jwtToken = authHeaders["authorization"].split(" ")[1];
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", (error, payload) => {
      if (error) {
        console.log("jwt not matched");
        response.status(401);

        response.send("UnAuthorised");
      } else {
        console.log("in authenticate token");
        next();
      }
    });
  }
};

app.post("/register", async (request, response) => {
  const userData = request.body;
  console.log(userData);
  console.log(request.body);
  const { username, name, password } = userData;

  const checkUserQuery = `
    SELECT * FROM users WHERE username = '${username}';
    `;

  const dbUser = await db.get(checkUserQuery);
  if (dbUser !== undefined) {
    response.status(400);
    response.send("Username already exist");
  }
  if (password.length < 6) {
    response.status(400);
    response.send("Password is too short");
  } else {
    const prime = false;
    const hashedPassword = await bcrypt.hash(password, 10);
    const createUserQuery = `
    INSERT INTO 
        users(username,name,password,prime)
    VALUES
        (
            '${username}','${name}','${hashedPassword}','${prime}'
        )
    
    `;

    await db.run(createUserQuery);
    const payload = { username: username };
    const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
    response.send({ jwt_token: jwtToken });
    response.status(200);
  }
});

app.post("/login/", async (request, response) => {
  const credentials = request.body;
  const { username, password } = credentials;
  const checkUserQuery = `
  SELECT * FROM users  WHERE  username = '${username}'
  `;
  const dbUser = await db.get(checkUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send({ error_msg: "Invalid user" });
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwt_token: jwtToken });
      response.status(200);
    } else {
      response.status(400);
      response.send({ error_msg: "Incorrect Password" });
    }
  }
});

app.get("/products/", authenticateToken, async (request, response) => {
  console.log("in api");
  const {
    sort_by = "PRICE_LOW",
    category = "",
    title_search = "",
    rating = 1,
  } = request.query;

  const order = sort_by === "PRICE_LOW" ? "ASC" : "DESC";

  const getProductsQuery = `
  SELECT * FROM products WHERE 
  title like '%${title_search}%' 
  and rating >= ${rating} 
  and category like '%${category}%'
  ORDER BY price ${order}
  `;

  const productsList = await db.all(getProductsQuery);
  response.status(200);
  response.send(productsList);
});

app.post("/admin/addproduct/", async (request, response) => {
  const product = request.body;
  const { title, brand, price, id, image_url, rating, category } = product;

  const addProductQuery = `
  INSERT INTO  products(title,brand,price,id,image_url,rating,category)
  VALUES 
  (
    '${title}','${brand}','${price}','${id}','${image_url}','${rating}','${category}'
  )
  `;

  const dbResponse = await db.run(addProductQuery);
  response.status(200);
  response.send({ lastID: dbResponse.lastID });
});

module.exports = app;
