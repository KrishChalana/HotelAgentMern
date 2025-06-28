const hotelData = require("./hotel_data.json");

function string_similarity(hotelNameQuery,similarityThreshold = 0.75) {
  if (!hotelData || hotelData.length === 0) {
    console.warn("Hotel data is empty or not loaded.");
    return null;
  }

  let bestMatch = null;
  let highestSimilarityScore = 0; // Score will be 0 to 1

  const normalizedQuery = hotelNameQuery
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");

  if (normalizedQuery.length === 0) {
    console.log("DEBUG: Normalized query is empty.");
    return null;
  }

  for (const hotel of hotelData) {
    const officialHotelName = hotel?.hotel_name;
    if (officialHotelName) {
      const normalizedOfficialName = officialHotelName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "");

      let distance = null;
      // Calculate Levenshtein distance
      (async () => {
        const levenshtein = await import("levenshtein-edit-distance");

        distance = levenshtein.levenshteinEditDistance(
          normalizedQuery,
          normalizedOfficialName
        );
      })();

      // Convert distance to a similarity score (0 to 1)
      // A common way to do this is: 1 - (distance / max_length)
      const maxLength = Math.max(
        normalizedQuery.length,
        normalizedOfficialName.length
      );
      let similarity = 0;
      if (maxLength > 0) {
        // Avoid division by zero
        similarity = 1 - distance / maxLength;
      }

      if (similarity > highestSimilarityScore) {
        highestSimilarityScore = similarity;
        bestMatch = hotel;
      }

      if (bestMatch && highestSimilarityScore >= similarityThreshold) {
        console.log(
          `DEBUG: Matched '${hotelNameQuery}' to '${bestMatch}' with score ${highestSimilarityScore.toFixed(
            3
          )}`
        );

        return bestMatch;
      } else {
        return null;
      }
    }
  }
}
function get_hotel_info(parameters, similarityThreshold = 0.75) {
  const hotelNameQuery = parameters.hotel_name;
 
  const bestMatch = string_similarity(hotelNameQuery);
  if (bestMatch !== null) {
    const bestMatch_redone = {
      hotel_name: bestMatch.hotel_name,
      check_in_time: bestMatch.check_in_time,
      check_out_time: bestMatch.check_out_time,
      current_status: bestMatch.current_status,
      reopening_date: bestMatch.reopening_date,
      amenities: bestMatch.amenities,
      // room_availabilty : bestMatch.room_types_available
    };

    return bestMatch_redone;
  } else {
    console.log(
      `DEBUG: No strong match found for '${hotelNameQuery}'.
      )}`
    );
    return null;
  }
}

function get_room_service_menu(parameters) {
  const hotel_para = parameters.hotel_name;
  const category = parameters.category; // Lazy to perform search will let the AI do it

 
  const hotelName = string_similarity(hotel_para);

  const roomServiceMenu = hotelName.room_service_menu || [];
  if (roomServiceMenu.length === 0) {
    console.warn(`No room service menu found for hotel: ${hotel_para}`);
    return null;
  }else{
     return JSON.stringify(roomServiceMenu);
  }


  




}


function place_room_service_order(parameters) {
    hotel_name = parameters.hotel_name;
    
    room_number = parameters.room_number;
    special_requests = parameters.special_requests || "No special requests";
    items = parameters.items; // This should be an array of item names
    console.log(
      `Placing order for hotel: ${hotel_name}, room: ${room_number}, items: ${items.join(
        ", "
      )}, special requests: ${special_requests}`
    );
     
    return `Order placed successfully for room ${room_number} at ${hotel_name}. OrderID - #2406`
      
    
  }


function check_room_availability(parameters) {

    hotel_name = parameters.hotel_name;
    room_type = parameters.room_type;
    check_in_date = parameters.check_in_date;
    check_out_date = parameters.check_out_date;

    const hotel_dict = string_similarity(hotel_name);
    if (!hotel_dict) {
      return { message: "Hotel not found." };
    }else{
      return JSON.stringify({
        room_types_available : hotel_dict.room_types_available || [],
        message: `Room availability for ${room_type} at ${hotel_name} from ${check_in_date} to ${check_out_date} is available if the type of room is mentioned in the room_types_available list.`,
      })
    }










 
}


function get_amenities(parameters) {
    hotel_name = parameters.hotel_name;
    const hotel_dict = string_similarity(hotel_name);
    if (!hotel_dict) {
      return { message: "Hotel not found." };
    } else {
      return JSON.stringify({
        amenities: hotel_dict.amenities || [],
        message: `Amenities available at ${hotel_name}: ${hotel_dict.amenities.join(", ")}`,
      });
    }
  
  
  }





module.exports = {
  get_hotel_info,
  place_room_service_order,
  get_room_service_menu,
  check_room_availability,
  get_amenities
};
