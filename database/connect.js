import mongoose from 'mongoose'

const Connection = async (user,password)=>{
    try{
        const URL = `mongodb+srv://${user}:${password}@miiramadhyam.wpftbvp.mongodb.net/MiiraMadhyam?retryWrites=true&w=majority`;
        await mongoose.connect(URL,{ useNewUrlParser: true, reconnectTries: 30, reconnectInterval: 500, poolSize: 1, socketTimeoutMS: 2000000, keepAlive: true });
        console.log("Database Connected Successfully");

    }catch(error){
            console.log("Error while connnecting with database",error.message);
    }
}
export default Connection;