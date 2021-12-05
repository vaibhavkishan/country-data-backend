const fs = require("fs");
const Joi = require("joi");
const _ = require("lodash");
const multer = require("multer");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/images", express.static("images"));

let countryObj = JSON.parse(fs.readFileSync("./data/data.json").toString());

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./images");
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 4000000,
  },
  fileFilter(req, file, callback) {
    if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
      callback(new Error("Please upload an image."));
    }
    callback(undefined, true);
  },
});

app.get("/countries", (req, res) => {
  let subset = countryObj.countries.map((c) => _.pick(c, ["name", "rank"]));
  res.send(subset);
});

app.get("/countriesAll", (req, res) => {
  res.send(countryObj);
});

app.get("/countries/:rank", (req, res) => {
  const country = countryObj.countries.find(
    (c) => c.rank === parseInt(req.params.rank)
  );
  if (!country) return res.status(404).send("Error 404 - Not Found");
  res.send(country);
});

app.post("/country", upload.single("flag"), (req, res) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(20).required(),
    continent: Joi.string().required(),
    rank: Joi.number().integer().max(200).required(),
  });
  const result = schema.validate(req.body);
  if (result.error)
    return res.status(400).send(result.error.details[0].message);

  const existingCountry = countryObj.countries.find(
    (c) => c.name === req.body.name
  );

  const existingRank = countryObj.countries.find(
    (c) => c.rank === parseInt(req.body.rank)
  );

  if (existingCountry || existingRank)
    return res.status(400).send("Country name or Rank already exists.");

  const country = {
    name: req.body.name,
    continent: req.body.continent,
    flag: req.file.path.replace("\\", "/"),
    rank: parseInt(req.body.rank),
  };

  countryObj.countries.push(country);

  fs.writeFile("./data/data.json", JSON.stringify(countryObj), function (err) {
    if (err) {
      return res.status(400).send(err.message);
    }
    return res.status(200).send(countryObj);
  });
});

const port = process.env.port || 8080;
app.listen(port, () => console.log(`Listening on Port ${port}...`));
