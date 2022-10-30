import mongoose from "mongoose";

// data schemas of doctors and schemes
const Schemeschema = new mongoose.Schema({
    img:String,
    name: String,
    desc: String,
    issueBy: String,
    keyFeature: String,
    applicant: String,
    applyLink: String,
    aboutScheme: String,
  })
  
const Scheme = mongoose.model('Scheme', Schemeschema)

export default Scheme;