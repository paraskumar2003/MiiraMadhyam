import AWS from 'aws-sdk'
import multer from 'multer';

import {v4 as uuid} from 'uuid'

   
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET
  })



const UploadToS3 =  async (file,callback)=>{
    let myFile =file.originalname.split(".")
    const fileType = myFile[myFile.length - 1]
  
  
  
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `Images/${uuid()}.${fileType}`,
        Body: file.buffer
    }
  
    await s3.upload(params, (error, data) => {
        if(error){
            console.log(error);
        }
        console.log("s3 "+data.Location);
        callback(data.Location);
    })


}
export default UploadToS3;