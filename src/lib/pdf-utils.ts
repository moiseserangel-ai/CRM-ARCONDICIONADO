import { jsPDF } from 'jspdf';
import { domToJpeg } from 'modern-screenshot';
import { Contact, ServiceOrder, Invoice } from '../types';

export const generateInvoicePDF = async (invoice: Invoice, companyLogo?: string | null, companyName: string = 'Cardoso Ar Condicionado', settings?: any) => {
  const logoHtml = companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-height: 60px; max-width: 150px; object-fit: contain;" />` : '';

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';
  
  const itemsHtml = invoice.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalPrice)}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5;">
      <div style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="display: flex; align-items: flex-start; gap: 20px;">
          ${logoHtml}
          <div>
            <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Nota Fiscal de ${invoice.type}</h1>
            <p style="margin: 5px 0 0; font-weight: bold; color: #666;">${companyName}</p>
            ${settings?.cnpj ? `<p style="margin: 2px 0 0; font-size: 12px; color: #888;">CNPJ: ${settings.cnpj}</p>` : ''}
            ${settings?.phone ? `<p style="margin: 2px 0 0; font-size: 12px; color: #888;">Tel: ${settings.phone}</p>` : ''}
            ${settings?.email ? `<p style="margin: 2px 0 0; font-size: 12px; color: #888;">E-mail: ${settings.email}</p>` : ''}
            ${settings?.address ? `<p style="margin: 2px 0 0; font-size: 12px; color: #888;">Endereço: ${settings.address}</p>` : ''}
          </div>
        </div>
        <div style="text-align: right; padding-top: 5px;">
          <div style="font-size: 18px; font-weight: bold;">Nº ${invoice.number}</div>
          <div style="font-size: 12px; color: #666;">Série: ${invoice.series}</div>
          <div style="display: inline-block; margin-top: 5px; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; border: 1px solid #000;">${invoice.status}</div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
        <div style="flex: 1;">
          <h3 style="font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Dados do Cliente</h3>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Nome:</strong> ${invoice.contactName}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>CPF/CNPJ:</strong> ${invoice.contactCnpjCpf}</p>
        </div>
        <div style="flex: 1;">
          <h3 style="font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Detalhes da Nota</h3>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Data de Emissão:</strong> ${new Date(invoice.issueDate).toLocaleDateString('pt-BR')}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Valor Total:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.totalAmount)}</p>
        </div>
      </div>

      <div style="margin-bottom: 35px;">
        <h3 style="font-size: 14px; text-transform: uppercase; background: #f9f9f9; padding: 8px 12px; margin-bottom: 15px; border-left: 4px solid #000;">Itens</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr>
              <th style="padding: 8px; border-bottom: 2px solid #000; text-align: left;">Descrição</th>
              <th style="padding: 8px; border-bottom: 2px solid #000; text-align: center;">Qtd</th>
              <th style="padding: 8px; border-bottom: 2px solid #000; text-align: right;">V. Unitário</th>
              <th style="padding: 8px; border-bottom: 2px solid #000; text-align: right;">V. Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold;">Total da Nota:</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 16px;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${invoice.observations ? `
      <div style="margin-bottom: 35px;">
        <h3 style="font-size: 14px; text-transform: uppercase; background: #f9f9f9; padding: 8px 12px; margin-bottom: 15px; border-left: 4px solid #000;">Observações</h3>
        <div style="font-size: 15px; white-space: pre-wrap; padding: 0 12px;">${invoice.observations}</div>
      </div>
      ` : ''}

      <div style="margin-top: 80px;">
        <p style="text-align: center; font-size: 10px; color: #999; margin-top: 40px;">Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const imgData = await domToJpeg(container, {
      scale: 2,
      backgroundColor: '#ffffff'
    });
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`NF-${invoice.number}-${(invoice.contactName || 'Cliente').replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
};

export const generateOSPDF = async (os: ServiceOrder, contact: Contact, companyLogo?: string | null, companyName: string = 'Cardoso Ar Condicionado', settings?: any) => {
  const logoHtml = companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-height: 60px; max-width: 150px; object-fit: contain;" />` : '';

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';
  
  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5;">
      <div style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 20px;">
          ${logoHtml}
          <div>
            <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Ordem de Serviço</h1>
            <p style="margin: 5px 0 0; font-weight: bold; color: #666; font-size: 16px;">${companyName}</p>
            ${settings?.cnpj ? `<p style="margin: 2px 0 0; font-size: 12px; color: #888;">CNPJ: ${settings.cnpj}</p>` : ''}
            ${settings?.phone ? `<p style="margin: 2px 0 0; font-size: 12px; color: #888;">Tel: ${settings.phone}</p>` : ''}
            ${settings?.email ? `<p style="margin: 2px 0 0; font-size: 12px; color: #888;">E-mail: ${settings.email}</p>` : ''}
          </div>
        </div>
        <div style="display: inline-block; padding: 6px 16px; border-radius: 6px; font-size: 14px; font-weight: bold; text-transform: uppercase; border: 2px solid #000; letter-spacing: 1px;">${os.status}</div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
        <div style="flex: 1; background: #fcfcfc; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
          <h3 style="font-size: 12px; text-transform: uppercase; color: #888; margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Dados do Cliente</h3>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Nome:</strong> ${contact.name}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Endereço:</strong> ${contact.address || contact.location || 'Não informado'}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Telefone:</strong> ${contact.phone}</p>
        </div>
        <div style="flex: 1; background: #fcfcfc; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
          <h3 style="font-size: 12px; text-transform: uppercase; color: #888; margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Detalhes da OS</h3>
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
        <div style="display: flex; justify-content: space-between; gap: 50px; margin-top: 80px;">
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-end;">
            <div style="height: 80px;"></div>
            <div style="border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 12px; text-transform: uppercase;">Assinatura do Técnico</div>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-end;">
            <div style="height: 80px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 5px;">
              ${os.signature ? `<img src="${os.signature}" style="max-width: 100%; max-height: 80px;" />` : ''}
            </div>
            <div style="border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 12px; text-transform: uppercase;">Assinatura do Cliente</div>
          </div>
        </div>
        <p style="text-align: center; font-size: 10px; color: #999; margin-top: 40px;">Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const imgData = await domToJpeg(container, {
      scale: 2,
      backgroundColor: '#ffffff'
    });
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`OS-${os.id?.substring(0, 8).toUpperCase() || 'OS'}-${(contact.name || 'Cliente').replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    document.body.removeChild(container);
  }
};

export const generateReportPDF = async (reportRef: React.RefObject<HTMLDivElement>, metrics: any, companyLogo?: string | null, companyName: string = 'Cardoso Ar Condicionado', settings?: any) => {
  if (!reportRef.current) return;
  
  // hide buttons during screenshot
  const buttons = reportRef.current.querySelectorAll('button');
  const selects = reportRef.current.querySelectorAll('select');
  
  const originalButtonDisplays = Array.from(buttons).map(b => b.style.display);
  const originalSelectDisplays = Array.from(selects).map(s => s.style.display);
  
  buttons.forEach(b => b.style.display = 'none');
  selects.forEach(s => s.style.display = 'none');

  const cnpjHtml = settings?.cnpj ? `<p style="margin: 2px 0 0; font-size: 12px; color: #888;">CNPJ: ${settings.cnpj}</p>` : '';
  const phoneHtml = settings?.phone ? `<p style="margin: 2px 0 0; font-size: 12px; color: #888;">Tel: ${settings.phone}</p>` : '';
  const addressHtml = settings?.address ? `<p style="margin: 2px 0 0; font-size: 12px; color: #888;">Endereço: ${settings.address}</p>` : '';

  // Insert header
  const headerDiv = document.createElement('div');
  headerDiv.innerHTML = `
    <div style="font-family: Arial, sans-serif; background: #fff; padding-top: 20px;">
      <div style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="display: flex; align-items: flex-start; gap: 20px;">
          ${companyLogo ? `<img src="${companyLogo}" style="max-height: 80px; max-width: 180px; object-fit: contain;" />` : ''}
          <div>
            <h1 style="margin: 0 0 5px 0; font-size: 24px; text-transform: uppercase;">Relatório de Desempenho</h1>
            <p style="margin: 0; font-weight: bold; color: #444; font-size: 16px;">${companyName}</p>
            ${cnpjHtml}
            ${phoneHtml}
            ${addressHtml}
          </div>
        </div>
        <div style="text-align: right; padding-top: 5px;">
          <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Gerado em: ${new Date().toLocaleDateString('pt-BR')}</div>
          <div style="font-size: 14px; font-weight: bold; color: #333;">Faturamento: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalRevenue)}</div>
        </div>
      </div>
    </div>
  `;
  
  reportRef.current.insertBefore(headerDiv, reportRef.current.firstChild);

  try {
    await new Promise(r => setTimeout(r, 100)); // wait for layout/images

    const imgData = await domToJpeg(reportRef.current, {
      scale: 2,
      backgroundColor: '#ffffff'
    });
    
    // remove header and restore buttons
    reportRef.current.removeChild(headerDiv);
    buttons.forEach((b, i) => b.style.display = originalButtonDisplays[i]);
    selects.forEach((s, i) => s.style.display = originalSelectDisplays[i]);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const margin = 15;
    const pdfPageWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    const pdfWidth = pdfPageWidth - (margin * 2);
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    const playableHeight = pdfPageHeight - (margin * 2);
    let heightLeft = pdfHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, pdfWidth, pdfHeight);
    heightLeft -= playableHeight;

    while (heightLeft > 0) {
      position -= playableHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, pdfWidth, pdfHeight);
      heightLeft -= playableHeight;
    }

    pdf.save(`Relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    // restore just in case
    if (headerDiv.parentNode) reportRef.current.removeChild(headerDiv);
    buttons.forEach((b, i) => b.style.display = originalButtonDisplays[i]);
    selects.forEach((s, i) => s.style.display = originalSelectDisplays[i]);
    throw error;
  }
};

