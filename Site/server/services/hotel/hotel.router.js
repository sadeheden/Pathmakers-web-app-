import { Router } from "express";
import {
  getHotels,
  getHotelById,
  addHotel,
  updateHotel,
  deleteHotel,
  getHotelsByCityName,
} from "./hotel.controller.js";

const router = Router();

router
  .get("/city/:city", getHotelsByCityName) // must be before /:id
  .get("/:id", getHotelById)
  .get("/", getHotels)
  .post("/", addHotel)
  .put("/:id", updateHotel)
  .delete("/:id", deleteHotel);

export default router;
