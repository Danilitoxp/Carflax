import React from "react";
import { createRoot } from "react-dom/client";
import "./src/index.css";
import { RankingCorrida } from "./src/components/dashboard/RankingCorrida";
const nomes = ["Guilherme","Maria","Kelven","Thiago","Mateus","Gustavo","João","Lucas"];
const porcentagens = [173,87,72,61,47,34,21,12];
const cores=[4,5,2,1,3,7,6,0];
const linhas = nomes.map((nome,i)=>({cod:String(i+1),nome,percentual:porcentagens[i],vendidoHoje:100,metaDiaria:100,variacao:null}));
const garagens = new Map(linhas.map((l,i)=>[l.cod,{cor:cores[i],pecas:new Set(["rodas","aerofolio"])}]));
const root=createRoot(document.getElementById("root")!);
window.atualizarRanking = (cod,pct) => {linhas.find(l=>l.cod===cod).percentual=pct; render()};
function render(){root.render(<React.StrictMode><div style={{height:"100vh",padding:"10px 6px",background:"#030b16",display:"flex",flexDirection:"column"}}><RankingCorrida linhas={[...linhas]} garagens={garagens} meuCodigo="1" onAbrirGaragem={(cod)=>{window.garagemAberta=cod}} /></div></React.StrictMode>)}
render();
