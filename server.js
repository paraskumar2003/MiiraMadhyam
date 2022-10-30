import fs from 'fs'
import path, { resolve } from 'path'
import {} from 'dotenv/config.js'
import express from 'express'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'
import session from 'express-session'

import Connection from './database/connect.js'
import Scheme from './model/scheme.js'
import Doctor from './model/doctor.js'
import Gallery from './model/gallery.js'
import Banner from './model/banner.js'

import passport from 'passport'
import passportLocalMongoose from 'passport-local-mongoose'
import findOrCreate from 'mongoose-findorcreate'

import UploadToS3 from './s3-upload/s3upload.js'

const app = express()

// __dirname fix
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

const __dirname = path.dirname(__filename)

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))

app.use(
  session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false,
  }),
)

app.use(passport.initialize())
app.use(passport.session())

Connection(process.env.DB_USERNAME, process.env.DB_PASSWORD)

mongoose.set('useCreateIndex', true)

const userSchema = new mongoose.Schema({
  admin: String,
  password: String,
  secret: String,
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

const User = new mongoose.model('User', userSchema)

passport.use(User.createStrategy())

passport.serializeUser(function (user, done) {
  done(null, user.id)
})

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user)
  })
})

const doctors = []
const schemes = []
const images = []
const banners = []

const defaultDataRender = async () => {
  await Gallery.find({}, (err, found) => {
    if (!err) {
      images.length = 0
      for (var i = 0; i < 6; i++) {
        images.push(found[i])
      }
    }
  })

  await Doctor.find({}, (err, found) => {
    if (!err) {
      let len = found.length
      if (len > 3) len = 3
      doctors.length = 0
      for (var i = 0; i < len; i++) {
        doctors.push(found[i])
      }
    }
  })

  await Scheme.find({}, (err, found) => {
    let len = found.length
    if (len > 3) len = 3
    if (!err) {
      schemes.length = 0
      for (var i = 0; i < len; i++) {
        schemes.push(found[i])
      }
    }
  })
}
defaultDataRender()

const bannersRender = async () => {
  await Banner.find({}, (err, found) => {
    banners.length = 0
    found.forEach((item) => {
      banners.push(item)
    })
  })
}
bannersRender()

app.get('/', async (req, res) => {
  await bannersRender()
  await defaultDataRender().then(() => {
    res.render('Home', {
      doctorsToRender: doctors,
      schemesToRender: schemes,
      images: images,
      banners: banners,
    })
  })
})
app.get('/schemes', (req, res) => {
  Scheme.find({}, (err, found) => {
    if (!err) {
      res.render('Schemes', { SchemesToRender: found })
    } else {
      res.send(err)
    }
  })
})
app.get('/doctors', (req, res) => {
  Doctor.find({}, (err, found) => {
    if (!err) {
      res.render('Doctors', { doctorsToRender: found })
    }
  })
})
app.get('/about', (req, res) => {
  res.render('About')
})
app.get('/contact', (req, res) => {
  res.render('Contact')
})

let adminSideDoctors = []
let adminSideSchemes = []
let adminSidebanners = []

const adminSideData = async () => {
  await Doctor.find({}, (err, found) => {
    adminSideDoctors.length = 0
    found.forEach((item) => {
      adminSideDoctors.push(item)
    })
  })
  await Scheme.find({}, (err, found) => {
    adminSideSchemes.length = 0
    found.forEach((item) => {
      adminSideSchemes.push(item)
    })
  })
  await Banner.find({}, (err, found) => {
    adminSidebanners.length = 0
    found.forEach((item) => {
      adminSidebanners.push(item)
    })
  })
  resolve()
}

app.get('/login', function (req, res) {
  res.render('Login')
})

app.get('/register', function (req, res) {
  if (req.isAuthenticated()) {
    res.render('Register')
  } else {
    res.redirect('/login')
  }
})

const alert = []

function setAlert(value) {
  alert.length = 0
  alert.push(value)
}

setAlert('')

setInterval(() => {
  setAlert('')
}, 10000)

app.get('/admin', async (req, res) => {
  if (req.isAuthenticated()) {
    await adminSideData().then(() => {
      res.render('Upload', {
        doctors: adminSideDoctors,
        schemes: adminSideSchemes,
        banners: adminSidebanners,
        alert: alert[0],
      })
    })
  } else {
    res.redirect('/login')
  }
})

app.get('/logout', function (req, res) {
  req.logout()
  res.redirect('/')
})

app.post('/register', function (req, res) {
  User.deleteMany({}).then(function () {})
  User.register({ username: req.body.username }, req.body.password, function (
    err,
    user,
  ) {
    if (err) {
      res.redirect('/register')
    } else {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/admin')
      })
    }
  })
})

app.post('/login', function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  })

  req.login(user, function (err) {
    if (err) {
    } else {
      passport.authenticate('local', { failureRedirect: '/login' })(
        req,
        res,
        function () {
          res.redirect('/admin')
        },
      )
    }
  })
})

//setting middle ware
import multer from 'multer'

//setting routes

const storage = multer.memoryStorage({
  destination: function (req, file, callback) {
    callback(null, '/Images/')
  },
})

const upload = multer({ storage }).single('img')

app.post('/addGalleryImage', upload, async (req, res, next) => {
  Gallery.find({}, async (err, found) => {
    if (!err) {
      let imgID = found.length

      await UploadToS3(req.file, (data) => {
        var obj = {
          img: data,
          desc: req.body.desc,
          imgId: imgID,
        }
        Gallery.create(obj, (err, item) => {
          if (!err) {
            res.redirect('/admin')
          } else {
            res.send(err)
          }
        })
        if (imgID > 5) {
          Gallery.find({}, (e, f) => {
            let index = f[0]._id
            Gallery.deleteOne({ _id: index }, (err) => {})
          })
        }
      })
    }
  })
})
app.post('/addBannerImage', upload, async (req, res, next) => {
  Banner.find({}, async (err, found) => {
    if (!err) {
      let imgID = found.length

      await UploadToS3(req.file, (data) => {
        var obj = {
          img: data,
          imgId: imgID,
        }
        Banner.create(obj, (err, item) => {
          if (!err) {
            adminSideData()
            setAlert('added')
            res.redirect('/admin')
          } else {
            res.send(err)
          }
        })
      })
    }
  })
})

app.post('/deleteBanner', (req, res) => {
  Banner.deleteOne({ _id: req.body.id }, (err) => {
    if (!err) {
      adminSideData()
      setAlert('deleted')
      res.redirect('/admin')
    }
  })
})

app.post('/uploadDoctor', upload, async (req, res, next) => {
  await UploadToS3(req.file, (data) => {
    var obj = {
      img: data,
      name: req.body.name,
      desc: req.body.desc,
      expertise: req.body.expertise,
      experience: req.body.experience,
      address: req.body.address,
      clinicName: req.body.clinicName,
      fees: req.body.fees,
      aboutDoctor: req.body.aboutDoctor,
    }
    Doctor.create(obj, (err, item) => {
      if (!err) {
        adminSideData()
        setAlert('added')
        res.redirect('/admin')
      }
    })
  })
})
app.post('/uploadScheme', upload, async (req, res, next) => {
  await UploadToS3(req.file, (data) => {
    var obj = {
      name: req.body.name,
      desc: req.body.desc,
      img: data,
      issueBy: req.body.issueBy,
      keyFeature: req.body.keyFeature,
      applicant: req.body.applicant,
      applyLink: req.body.applyLink,
      aboutScheme: req.body.aboutScheme,
    }

    Scheme.create(obj, (err, item) => {
      if (!err) {
        adminSideData()
        setAlert('added')
        res.redirect('/admin')
      } else {
        setAlert('invalid-img')
        res.redirect('/admin')
      }
    })
  })
})

//Handling delete and update
app.post('/deleteScheme', (req, res) => {
  Scheme.deleteOne({ name: req.body.name }, (err, found) => {
    if (!err) {
      adminSideData()
      setAlert('deleted')
      res.redirect('/admin')
    }
  })
})
app.post('/deleteDoctor', (req, res) => {
  Doctor.deleteOne({ name: req.body.name }, (err, found) => {
    if (!err) {
      adminSideData()
      setAlert('deleted')
      res.redirect('/admin')
    }
  })
})
app.post('/renderUpdateDoctor', (req, res) => {
  Doctor.findOne({ name: req.body.name }, (err, found) => {
    if (!err) {
      res.render('UpdateDoctor', { item: found })
    }
  })
})
app.post('/renderUpdateScheme', (req, res) => {
  Scheme.findOne({ name: req.body.name }, (err, found) => {
    if (!err) {
      res.render('UpdateScheme', { item: found })
    }
  })
})
app.post('/updateDoctor', (req, res) => {
  let item = req.body
  if (item.action == 'update') {
    Doctor.findOneAndUpdate(
      { _id: item._id },
      {
        $set: {
          name: item.name,
          expertise: item.expertise,
          experience: item.experience,
          address: item.address,
          clinicName: item.clinicName,
          fees: item.fees,
          aboutDoctor: item.aboutDoctor,
        },
      },
      () => {
        adminSideData()
        setAlert('updated')
        res.redirect('/admin')
      },
    )
  } else {
    res.redirect('/admin')
  }
})

app.post('/updateScheme', (req, res) => {
  if (req.body.action === 'update') {
    Scheme.findOneAndUpdate(
      { _id: req.body._id },
      {
        $set: {
          name: req.body.name,
          issueBy: req.body.issueBy,
          keyFeature: req.body.keyFeature,
          applicant: req.body.applicant,
          applyLink: req.body.applyLink,
          aboutScheme: req.body.aboutScheme,
        },
      },
      () => {
        setAlert('updated')
        res.redirect('/admin')
      },
    )
  } else {
    res.redirect('/admin')
  }
})

import nodemailer from 'nodemailer'

// setting nodemailer
app.post('/send', (req, res) => {
  const output = `
    <p>You have a new contact request</p>
    <h3>Contact Details</h3>
    <ul>  
      <li>Name: ${req.body.name}</li>
      <li>Email: ${req.body.email}</li>
      <li>Phone: ${req.body.phone}</li>
    </ul>
    <h3>Message</h3>
    <p>${req.body.message}</p>
  `
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_ID,
      pass: process.env.MAIL_PASSWORD,
    },
  })

  let mailOptions = {
    from: 'MiiraMadhyam Website',
    to: 'miiramadhyamagra@gmail.com',
    subject: 'Contact Request',
    text: 'MiiraMadhyam',
    html: output,
  }

  transporter.sendMail(mailOptions, (err) => {})

  res.render('Contact')
})

app.listen(process.env.PORT || 3500)
