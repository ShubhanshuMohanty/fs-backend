const asyncHandler=(requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=> next(err))
    }
};

export {asyncHandler};




/*
//const asyncHandler=()=>{};
//const asyncHandler=(func)=>{()=>{}};
//const asyncHandler=(func)=>()=>{};


const asyncHandler=(fn)=>async (req,res,next)=>{
    try {
        await fn(req,res,next)
    } catch (error) {
        res.staus(err.code || 500).json({
            successe: false,
            message: err.message
        })
    }
}

*/