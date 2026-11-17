import {Component} from 'react';

export default class ErrorBoundary extends Component{
 constructor(props){super(props);this.state={error:null}}
 static getDerivedStateFromError(error){return {error}}
 componentDidCatch(error,info){console.error('SGDPU render error:',error,info)}
 componentDidUpdate(prev){if(prev.resetKey!==this.props.resetKey&&this.state.error)this.setState({error:null})}
 render(){
  if(this.state.error) return <div className="content"><div className="alert alert-danger">
   <b>Ocurrió un error mostrando esta sección.</b>
   <div className="small" style={{marginTop:6}}>{this.state.error.message}</div>
   <button className="btn btn-ghost" style={{marginTop:10}} onClick={()=>this.setState({error:null})}>Reintentar</button>
  </div></div>;
  return this.props.children;
 }
}
