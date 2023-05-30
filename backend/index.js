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
    response.send("Unauthorised  from middleware jwt is undefined");
    response.status(401);
  } else {
    const jwtToken = authHeaders["authorization"].split(" ")[1];
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("UnAuthorised");
      } else {
        next();
      }
    });
  }
};

app.post("/register", async (request, response) => {
  const userData = request.body;
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
  const {
    sort_by = "",
    category = "",
    title_search = "",
    rating = 1,
  } = request.query;
  const getProductsQuery = `
        SELECT
        * 
        FROM 
        products 
        where 
        title like '%${title_search}%' and 
        category like '%${category}%' and 
        rating >= ${rating} 
        order by price ${sort_by}
  `;
  const productsList = await db.all(getProductsQuery);
  response.status(200);
  response.send(productsList);
});

app.get(
  "/products/:productId/",
  authenticateToken,
  async (request, response) => {
    const { productId } = request.params;
    const getProductQuery = `
  select * from products where id = ${productId}
  `;
    const productDetails = await db.get(getProductQuery);
    response.send(productDetails);
    response.status(200);
  }
);

app.get(
  "/similar-products/:id",
  authenticateToken,
  async (request, response) => {
    const { id } = request.params;
    const getCatrgoryQuery = `
  SELECT 
    category
  FROM
    products
  WHERE 
    category like (
      SELECT 
        category 
      FROM 
        products 
      WHERE 
        id = ${id})
    `;

    const dbResponse = await db.get(getCatrgoryQuery);

    const getSimilarCategoryProducts = `
  SELECT 
      *
  FROM
      products 
  WHERE
      category= '${dbResponse.category}' and id <> ${id}
  `;

    const similarProducts = await db.all(getSimilarCategoryProducts);
    response.send(similarProducts);
  }
);

app.get("/other-products/:id", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const getCatrgoryQuery = `
  SELECT 
    category
  FROM
    products
  WHERE 
    category like (
      SELECT 
        category 
      FROM 
        products 
      WHERE 
        id = ${id})
    `;

  const dbResponse = await db.get(getCatrgoryQuery);
  const otherProductsQuery = `
    SELECT 
        *
    FROM
        products 
    WHERE
        category <> '${dbResponse.category}'
    `;

  const otherProducts = await db.all(otherProductsQuery);
  response.send(otherProducts);
});

app.get("/prime-deals/", authenticateToken, async (request, response) => {});

app.post("/admin/addproduct/", async (request, response) => {
  const product = request.body;
  console.log("entered into api");
  const { title, brand, price, id, image_url, rating, category } = product;
  for (let each of jsonData) {
    const { id, totalReviews, availability, description } = each;
    console.log("before update statement");
    const updateQuery = `
  update products set total_reviews = '${totalReviews}',availability = '${availability}',description = '${description}' where id = '${id}';
  `;

    await db.run(updateQuery);
  }
});

module.exports = app;
