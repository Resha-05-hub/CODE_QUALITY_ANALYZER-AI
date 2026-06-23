require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(
    helmet({
        crossOriginResourcePolicy: false,
    })
);

app.use(
    cors({
        origin: "*",
        allowedHeaders: "*",
    })
);

app.use(express.json());


// ===============================
// Extension Authentication
// ===============================
const authenticateExtension = (req, res, next) => {

    const receivedSecret = req.headers["x-extension-secret"];
    const correctSecret = process.env.EXTENSION_SECRET;

    console.log("Received Secret:", receivedSecret);
    console.log("Env Secret:", correctSecret);

    if (!receivedSecret || receivedSecret !== correctSecret) {
        return res.status(403).json({
            error: "Unauthorized request"
        });
    }

    next();
};


// ===============================
// AI Prompt Generator
// ===============================
function getFeaturePrompt(feature, code, language) {

    return `
You are an expert coding assistant.

Feature:
${feature}

Language:
${language}

Analyze this code:

${code}

Rules:
- Give explanation
- Give hints
- Do not provide complete solution code
- Help user learn
`;
}


// ===============================
// AI API
// ===============================
app.post("/api/analyze", authenticateExtension, async (req,res)=>{

    const {feature, code, language} = req.body;


    if(!code){
        return res.status(400).json({
            error:"No code received"
        });
    }


    const prompt = getFeaturePrompt(
        feature,
        code,
        language || "Auto"
    );


    try{

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {

            method:"POST",

            headers:{
                "Content-Type":"application/json",

                "Authorization":
                `Bearer ${process.env.GROQ_API_KEY}`
            },


            body:JSON.stringify({

                model:"llama-3.1-8b-instant",

                messages:[

                    {
                        role:"system",
                        content:
                        "You are an expert programming mentor."
                    },

                    {
                        role:"user",
                        content:prompt
                    }

                ]

            })

        });


        const data = await response.json();


        if(!response.ok){

            console.log("Groq Error:",data);

            return res.status(response.status).json({
                error:data.error?.message || "Groq error"
            });

        }


        res.json({

            result:
            data.choices[0].message.content

        });


    }
    catch(error){

        console.log(error);

        res.status(500).json({
            error:"Server error"
        });

    }

});



// ===============================
// Test route
// ===============================
app.get("/",(req,res)=>{

    res.send("AI Backend Running");

});


app.get("/health",(req,res)=>{

    res.send("OK");

});


// Start server

app.listen(PORT,()=>{

    console.log(
        `Server running on port ${PORT}`
    );

    console.log(
        "Secret loaded:",
        process.env.EXTENSION_SECRET ? "YES":"NO"
    );

});