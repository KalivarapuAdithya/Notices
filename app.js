const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const wakeDyno = require("woke-dyno");

require('dotenv').config();

const app = express();
const url = process.env.URL;
const PORT = process.env.PORT || 3000;
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
    user: process.env.USER,
    pass: process.env.PASS
    }
});
const accounts = require('./models').account;
// const last = require('./models').last;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true
}));

app.use(flash());



app.get('/' , (req , res)=>{
    res.render('index' , {success : req.flash('success') , error : req.flash('error')});
});

app.post('/subscribe',(req , res)=>{
    let email = req.body.email;
    accounts.findOne({email:email} , (err , user)=>{
        if(err)
        {
            console.log(err);
        }
        else if(!user)
        {
            let User = new accounts();
            User.email = email;
            User.isSub = true;
            User.save((err)=>{
                if(err)
                console.log(err);
                else{
                    req.flash('success' , `${email} Thanks for Subscribing to NITD Notices`);
                    res.redirect('/');
                }
            })
        }
        else{
            if(user.isSub == true)
            {
                req.flash('error' , `${email} has been resgistered already`);
                res.redirect('/');
            }
            else{
                user.isSub = true;
                user.save((err)=>{
                    if(err)
                    console.log(err);
                    else{
                        req.flash('success' , `Welcome back ${email}`);
                        res.redirect('/');
                    }
                });
            }
            
        }
    })
});

app.post('/unsubscribe' , (req , res)=>{
    let email = req.body.email;
    accounts.findOne({email:email} , (err , user)=>{
        if(err)
        console.log(err);
        else if(!user)
        {
            req.flash('error' , `${email} is not yet Subscribed. Provide a valid Email`);
            res.redirect('/');
        }
        else{
            if(user.isSub == false)
            {
                req.flash('error' , `${email} is already Unsubscribed. Provide a valid Email`);
                res.redirect('/');
            }
            else{
                user.isSub = false;
                user.save((err)=>{
                    if(err)
                    console.log(err);
                    else{
                        req.flash('success' , `${email} is successfully Unsubscribed`);
                        res.redirect('/');
                    }
                })
            }
        }
    })
})



async function createPage()
{
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    return page;
}

async function getData(page)
{
    await page.reload();
    let lis = await page.evaluate(()=>{
        let elements = document.getElementsByClassName('list-group-item');
        let data = [];
        let presentDate = new Date();
        for(let i=0;i<elements.length;i++)
        {
            let link = elements[i].getAttribute('href');
            let date = elements[i].childNodes[0].innerText.trim().split("-");
            let content = elements[i].text.trim();
            content = content.substring(10).trim();
            if(date[0] == presentDate.getFullYear() &&
                date[1] == presentDate.getMonth()+1 &&
                date[2] == presentDate.getDate())
            {
                data.push({link , date , content});
            }
            
            
        }
        return data;
    });
    return lis;
}

let lastMsg = {};

async function sendMail(data)
{
    let mails = await accounts.find({isSub : true});
    mails = mails.map((m)=> m.email);
    if(mails.length == 0)
    {
        console.log('No subscribers');
        return ;
    }
    
    let newdata = [];
    data.forEach((d)=>{
        if(lastMsg[d.content] !== 1)
        {
            newdata.push(d);
        }
    })
    if(data.length == 0 || newdata.length == 0)
    {
        console.log('no new notifications');
        return ;
    }
    

    mails.forEach((mail)=>{
        let mailOptions = {
            from: process.env.USER,
            to: mail,
            subject: 'New Notice',
            html : `
            <h2>New Notice(s):</h2>
            <ol>
                ${
                    data.map((d)=>(
                        `<li> <a href = ${d.link} style = "text-decoration : none"> <b>${d.content}</b> </a> </li>`
                    ))
                }
            <ol>  
            <br><br>
            <br><br>
            <a href = 'https://notices0136.herokuapp.com/'> click here to unsubscribe </a>      
            `
        };
    
        
        
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                lastMsg = {};
                newdata.forEach((d)=>{
                    lastMsg[d.content] = 1;
                })
                console.log('Email sent: ' + info.response);
            }
        });
    });
    
    
    
    
}

async function monitor()
{
    const page = await createPage();
    const data = await getData(page);
    // console.log(data);
    sendMail(data);
}

monitor();

setInterval(monitor , 600000);


app.listen(PORT , ()=>{
    wakeDyno({
        url: "https://notices0136.herokuapp.com/" ,  // url string
        interval: 60000, // interval in milliseconds (1 minute in this example)
        
    }).start(); 
})
