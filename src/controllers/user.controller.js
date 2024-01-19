import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  Jwt  from "jsonwebtoken";

const generateAccessAndRefreshToken= async (userId)=>
{
    try {
        
        const user=await User.findById(userId)
        
        const accessToken= user.generateAccessToken();
        console.log("smhi");
        const refreshToken=user.generateRefreshToken();

        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave: false})
        
        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refreshing access token");
    }
}

const registerUser= asyncHandler(async (req,res)=>{
    
    const{fullName,email,username,password}=req.body

    console.log("email:",email);

    if(
        [fullName,email,username,password].some((field)=> field?.trim()=== "")
    )
    {
        throw new ApiError(400,"All field are required")
    }
    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser)
    {
        throw new ApiError(409,"User with email or username already exists")
    }

    const avatarLocalPath=req.files?.avatar[0]?.path;
    //const coverImageLocalPath=req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
    }

    const user=await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500,"something went wrong while resistering user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User register successfully")
    )
})

const loginUser= asyncHandler(async(req,res)=>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email,username,password}=req.body;

    if(!username && !email)
    {
        throw new ApiError(400, "username or email is required" )
    }

    const user=await User.findOne({
        $or: [{username},{email}]
    })

    if(!user)
    {
        throw new ApiError(400,"user not found");
    }

    const isPasswordValid=await user.isPasswordCorrect(password);

    if(!isPasswordValid)
    {
        throw new ApiError(401,"password is incorrect");
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken");

    const options={ //isase koi bhi bfrontend me cookies ko change nahi kar payega ,cookies ko bas dekh sakte ,change bas server side se hogas c
        httpOnly : true ,
        secure: true,
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "user logged in successfully"
        )
    )

})

const logoutUser= asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        { //isase new updated value milegi
            new :true
        }
    )

    const options={ //isase koi bhi bfrontend me cookies ko change nahi kar payega ,cookies ko bas dekh sakte ,change bas server side se hogas c
        httpOnly : true ,
        secure: true,
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(
            200,
            {},
            "user logged out successfully"
        )
    )
})

const refereshAccessToken= asyncHandler(async(req,res)=>{
  const incommingRefreshToken=  req.cookies.refreshToken || req.body.refreshToken;

  if (!incommingRefreshToken) {
    throw new ApiError(401,"unautorized request")
  }

  try {
    const decodedToken=await Jwt.verify(
      incommingRefreshToken,
      process.env.ACCESS_TOKEN_SECRET,
  
    )
  
    const user=await User.findById(decodedToken?._id);
  
    if (!user) {
      throw new ApiError(401,"Invalid refresh token")
    }
  
    if (incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401,"refresh token is expried or used")
    }
  
    const options={
      httpOnly: true,
      secure: true
    }
  
    const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id)
  
    return res
    .status(200)
    .cookies("accessToken",accessToken,options)
    .cookies("refreshToken",newRefreshTokenefreshToken,options)
    .json(
      new ApiResponse(
          200,
          {accessToken,"refreshToken":newRefreshToken},
          "Acessed token refreshed successfully"
      )
    )
  } catch (error) {
    throw new ApiError(401,error?.message || "invalid refresh token")
  }

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refereshAccessToken
}