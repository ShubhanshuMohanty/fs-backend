import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoScema= new Schema(
    {
        videoFile : {
            type: String,//cl
            required: true
        },
        thumbnail : {
            type: String,//cl
            required: true
        },
        title : {
            type: String,
            required: true
        },
        description : {
            type: String,
            required: true
        },
        duration : {
            type: Number, //cl
            required: true
        },
        views : {
            type: Number,
            default: 0,

        },
        isPublish: {
            type: Boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

videoScema.plugin(mongooseAggregatePaginate);

export const Video=mongoose.model("Video",videoScema);