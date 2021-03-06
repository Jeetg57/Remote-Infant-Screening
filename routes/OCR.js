const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Image = require("../models/OCR-Model");
const { createWorker } = require("tesseract.js");
const verify = require("../verifyToken");

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/ocr");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
var upload = multer({ storage: storage });
router.post(
  "/ocr-upload",
  upload.single("image"),
  verify,
  async (req, res, next) => {
    const file = req.file;
    if (!file) {
      const error = new Error("Please upload a file");
      error.httpStatusCode = 400;
      return next(error);
    } else {
      const worker = createWorker({
        logger: (m) => console.log(m),
      });
      (async () => {
        await worker.load();
        await worker.loadLanguage("eng");
        await worker.initialize("eng");
        const {
          data: { text },
        } = await worker.recognize("uploads/ocr/" + file.filename);
        await worker.terminate();
        const image = new Image({
          filename: file.filename,
          path: file.filename,
          size: file.size,
          upload_date: new Date(),
          text: text,
        });
        try {
          const savedResult = await image.save();
          res.json(savedResult);
        } catch (err) {
          res.json({ message: err });
        }
      })();
    }
  }
);

router.get("/", verify, async (req, res) => {
  try {
    const results = await Image.find().sort({ upload_date: -1 });
    res.json(results);
  } catch (err) {
    res.json({ message: err });
  }
});

router.get("/:imageId", async (req, res) => {
  try {
    const result = await Image.findById(req.params.imageId);
    res.json(result);
  } catch (err) {
    res.json({ message: err });
  }
});

router.delete("/:imageId", async (req, res) => {
  try {
    const removed = await Image.deleteOne({ _id: req.params.imageId });
    res.json(removed);
  } catch (err) {
    res.send({ message: err });
  }
});

module.exports = router;
