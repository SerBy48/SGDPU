export default function Modal({title,onClose,children,size}){
 return <div className="modal-bg" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className={'modal'+(size==='lg'?' modal-lg':'')} role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><h3>{title}</h3><button className="close" onClick={onClose} aria-label="Cerrar">✕</button></div><div className="modal-body">{children}</div></div></div>
}
