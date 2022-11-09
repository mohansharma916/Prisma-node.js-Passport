const { hashSync, compareSync } = require('bcrypt');
const jwt = require('jsonwebtoken');

const express = require('express');
const app = express();
const cors = require('cors');


const { PrismaClient } = require('@prisma/client')
const session = require('express-session')

const prisma = new PrismaClient()
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}))
/// config -passport
const JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;
const opts = {}
const passport = require('passport')

opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = 'Random string';

passport.use(new JwtStrategy(opts, function (jwt_payload, done) {
    console.log(jwt_payload)
    prisma.user.findUnique({where:{id: jwt_payload.id} }).then(user=>{
        console.log(user)
        if (user) {
            return done(null, user);
    }})
}));
///
app.use(passport.initialize())
app.use(passport.session())
app.get('/', (req, res) => {
    res.send("Hello World")
})
app.get('/users',async (req,res)=>{
    const users= await prisma.user.findMany();
    res.send(users)
})

app.post('/register', async(req, res) => {
    
        username= req.body.username;
        password= hashSync(req.body.password, 10)
    prisma.user.create({
    data:{
        username,
        password
    }
   }).then(user => {
        res.send({
            success: true,
            message: "User created successfully.",
            user: {
                id: user.id,
                username: user.username,
                
            }
        })
    }).catch(err => {
        res.send({
            success: false,
            message: "Something went wrong",
            error: err
        })
    })
})

app.post('/login', (req, res) => {
    prisma.user.findUnique({where:{ username: req.body.username} }).then(user => {
        //No user found
        if (!user) {
            return res.status(401).send({
                success: false,
                message: "Could not find the user."
            })
        }

        //Incorrect password
        if (!compareSync(req.body.password, user.password)) {
            return res.status(401).send({
                success: false,
                message: "Incorrect password"
            })
        }

        const payload = {
            username: user.username,
            id: user.id
        }

        const token = jwt.sign(payload, "Random string", { expiresIn: "1d" })

        return res.status(200).send({
            success: true,
            message: "Logged in successfully!",
            token: "Bearer " + token
        })
    })
})
app.get('/protected', passport.authenticate('jwt', { session: false }), (req, res) => {
    return res.status(200).send({
        success: true,
        user: {
            id: req.user.id,
            username: req.user.username,
        }
    })
})
app.listen(3000, () => {
    console.log(`server is running at port${3000}` )
});