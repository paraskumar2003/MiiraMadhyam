import mongoose from 'mongoose';

//   Doctor

const doctorSchema = mongoose.Schema({
    img:String,
    name: String,
    expertise: String,
    experience: String,
    address: String,
    clinicName: String,
    fees: String,
    aboutDoctor: String,
  })
  
const Doctor = mongoose.model('Doctor', doctorSchema);

export default Doctor;
  