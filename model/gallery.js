import mongoose from "mongoose";


const gallerySchema = mongoose.Schema({
    img:String,
    desc:String,
    imgId:Number
  });
  
const Gallery = mongoose.model('Gallery',gallerySchema);

export default Gallery;