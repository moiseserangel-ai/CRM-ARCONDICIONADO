import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Contact, ServiceOrder } from '../types';

export const generateOSPDF = async (os: ServiceOrder, contact: Contact) => {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';
  
  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5;">
      <div style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Ordem de Serviço</h1>
          <p style="margin: 5px 0 0; font-weight: bold; color: #666;">Cardoso Ar Condicionado</p>
        </div>
        <div style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; border: 1px solid #000;">${os.status}</div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
        <div style="flex: 1;">
          <h3 style="font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Dados do Cliente</h3>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Nome:</strong> ${contact.name}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Endereço:</strong> ${contact.address}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Telefone:</strong> ${contact.phone}</p>
        </div>
        <div style="flex: 1;">
          <h3 style="font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Detalhes da OS</h3>
          <p style="margin: 5px 0; font-size: 14px;"><strong>ID:</strong> ${os.id.substring(0, 8).toUpperCase()}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Data:</strong> ${new Date(os.createdAt).toLocaleDateString('pt-BR')}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Assunto:</strong> ${os.subject}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Valor:</strong> ${os.value || 'R$ 0,00'}</p>
        </div>
      </div>

      <div style="margin-bottom: 35px;">
        <h3 style="font-size: 14px; text-transform: uppercase; background: #f9f9f9; padding: 8px 12px; margin-bottom: 15px; border-left: 4px solid #000;">Descrição do Serviço</h3>
        <div style="font-size: 15px; white-space: pre-wrap; padding: 0 12px;">${os.description}</div>
      </div>

      ${os.finalizationNotes ? `
      <div style="margin-bottom: 35px;">
        <h3 style="font-size: 14px; text-transform: uppercase; background: #f9f9f9; padding: 8px 12px; margin-bottom: 15px; border-left: 4px solid #000;">Relatório de Finalização</h3>
        <div style="font-size: 15px; white-space: pre-wrap; padding: 0 12px;">${os.finalizationNotes}</div>
      </div>
      ` : ''}

      <div style="margin-bottom: 35px;">
        <h3 style="font-size: 14px; text-transform: uppercase; background: #f9f9f9; padding: 8px 12px; margin-bottom: 15px; border-left: 4px solid #000;">Materiais Utilizados</h3>
        <div style="font-size: 15px; white-space: pre-wrap; padding: 0 12px;">${os.materials || 'Nenhum material registrado.'}</div>
      </div>

      <div style="margin-top: 80px;">
        <div style="display: flex; justify-content: space-between; gap: 50px; margin-top: 60px;">
          <div style="flex: 1; border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 12px; text-transform: uppercase;">Assinatura do Técnico</div>
          <div style="flex: 1; border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 12px; text-transform: uppercase;">Assinatura do Cliente</div>
        </div>
        <p style="text-align: center; font-size: 10px; color: #999; margin-top: 40px;">Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`OS-${os.id?.substring(0, 8).toUpperCase() || 'OS'}-${(contact.name || 'Cliente').replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
};
