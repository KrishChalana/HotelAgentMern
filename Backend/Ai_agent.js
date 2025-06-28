require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const systemInstruction = require("./system_instructions.json");
const {
  get_hotel_info,
  get_room_service_menu,
  place_room_service_order,
  check_room_availability,
  get_amenities,
} = require("./Tools.js");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });



const tools = {
  get_hotel_info: get_hotel_info,
  get_room_service_menu: get_room_service_menu,
  place_room_service_order: place_room_service_order,
  check_room_availability: check_room_availability,
  get_amenities: get_amenities,
};






async function main(message,history) {
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    history: [
      {
        role: "user",
        parts: [{ text: JSON.stringify(systemInstruction) }],
      },
      ...history,
      
    ],
  });



 

    

    const response = await chat.sendMessage({
      message: message,
    });

    // console.log(response)

    for (key in JSON.parse(response.text)) {
      if (key === "text_response") {
       return JSON.parse(response.text)["text_response"]
      } else {
        const TOOL_TO_BE_CALLED =
          tools[JSON.parse(response.text)["tool_calling"]["name"]];
        const data = TOOL_TO_BE_CALLED(
          JSON.parse(response.text)["tool_calling"]["parameters"]
        );

        const after_tool_called_msg = await chat.sendMessage({
          message: `{data Returned From Using Tool get_hotel_info: ${data}}, Use This and Provide Proper Response To the user.`,
        });
          return JSON.parse(after_tool_called_msg.text)["text_response"]
      }
    }
  
}

module.exports = {
  main,
};
