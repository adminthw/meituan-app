import mongoose from "mongoose";
const Schema = mongoose.Schema;
const StyleSchema = new Schema({
  name: {
    type: String
  },
  type: {
    type: String
  },
  biz_ext: {
    type: Object
  },
  photos: {
    type: Array
  },
  url: {
    type: String
  },
  location: {
    type: String
  },
  tel: {
    type: String
  },
  tag: {
    type: Array
  },
  addr: {
    type: String
  }
});
export default mongoose.model("Style", StyleSchema);
