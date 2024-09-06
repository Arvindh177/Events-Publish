import { Link,  useParams } from "react-router-dom";
import AccountNav from "../AccountNav";
import { useEffect, useState } from "react";
import axios from "axios";
import PlaceImg from "../PlaceImg";

export default function PlacesPage() { 
    const [places,setPlaces] = useState([]);
useEffect(()=>{
    axios.get('/user-places').then(({data}) => {
         setPlaces(data);
    });
},[]);
    return(
        <div>
            <AccountNav/>
                
            <div className='mt-4  text-center'>
                List of all added places
                <br/>
            <Link className='inline-flex bg-primary gap-2 text-white py-2 px-6 rounded-full' to = {'/account/places/new'}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>  Add new event
                </Link>
             </div>
             <div className="mt-4">
                {places.length > 0 && places.map(place =>(
                    <Link to={'/account/places/'+place._id} className="flex cursor-pointer gap-4 bg-gray-200 p-4 rounded-2xl">
                        <div className="flex w-32 h-32 bg-gray-300 grow shrink-0">
                            <PlaceImg place={place}/>
                            </div>
                            <div className="grow-0 shrink">
                            <h2 className="text-xl">
                            {place.title} 
                            </h2>
                            <p className="text-sm mt-2 ">{place.description}</p>
                            </div>
                    
                    </Link>
                ))}
             </div>
            
        </div>
    )
    
}