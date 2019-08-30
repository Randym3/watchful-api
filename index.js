const express = require("express");
const app = express();
const morgan = require("morgan");
const cors = require("cors");
const config = require("config");

const watches = require("./routes/watches");
const users = require("./routes/users");
const auth = require("./routes/auth");

const corsOptions = {
  exposedHeaders: "x-auth-token"
};

app.use(cors(corsOptions));

app.use(express.json());

if (!config.get("tokenKey")) {
  console.error("FATAL ERROR: jwt private key is not defined.");
  process.exit(1);
}

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.send({ message: "hello world" });
});
app.use("/api/auth", auth);
app.use("/api/watches", watches);
app.use("/api/users", users);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port}..`);
  //   console.log(`Node enviornment: ${process.env.NODE_ENV}`);
});
