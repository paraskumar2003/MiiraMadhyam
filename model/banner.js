import mongoose from "mongoose";

const bannerSchema = mongoose.Schema({
    img:String,
    imgId:Number
  });
  
const Banner = mongoose.model('Banner',bannerSchema);

export default Banner;