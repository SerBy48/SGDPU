import {useEffect,useState} from 'react';

// Mismo punto de corte que el @media(max-width:760px) de theme.css.
export const MOBILE_QUERY='(max-width: 760px)';

export function useMediaQuery(query){
 const [matches,setMatches]=useState(()=>window.matchMedia(query).matches);
 useEffect(()=>{
  const mq=window.matchMedia(query);
  const onChange=e=>setMatches(e.matches);
  setMatches(mq.matches);
  mq.addEventListener('change',onChange);
  return()=>mq.removeEventListener('change',onChange);
 },[query]);
 return matches;
}

export const useIsMobile=()=>useMediaQuery(MOBILE_QUERY);
