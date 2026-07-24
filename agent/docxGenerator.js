const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, HeadingLevel, ImageRun, ShadingType } = require('docx');
const { HEADER_LOGO_BASE64, SIGNATURE_LOGO_BASE64 } = require('./logos');

const getBase64Data = (dataURI) => dataURI.replace(/^data:image\/\w+;base64,/, '');

function createSectionHeader(title, isAtlascoreStyle) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NIL },
      bottom: { style: BorderStyle.NIL },
      left: { 
        style: BorderStyle.SINGLE, 
        size: isAtlascoreStyle ? 4 : 12, 
        color: isAtlascoreStyle ? 'A3DACF' : '666666' 
      },
      right: { style: BorderStyle.NIL },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: isAtlascoreStyle ? 'E9F7F5' : 'F0F0F0', type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 100, bottom: 100, left: 150, right: 150 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: isAtlascoreStyle ? 'A3DACF' : 'FFFFFF' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: isAtlascoreStyle ? 'A3DACF' : 'FFFFFF' },
              right: { style: BorderStyle.SINGLE, size: 4, color: isAtlascoreStyle ? 'A3DACF' : 'FFFFFF' },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: title.toUpperCase(),
                    bold: true,
                    color: isAtlascoreStyle ? '1D6D63' : '333333',
                    size: 24, // 12pt
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function createMetaTable(meeting, isAtlascoreStyle) {
  const bgColor = isAtlascoreStyle ? '0B3A42' : 'F9F9F9';
  const textColor = isAtlascoreStyle ? 'FFFFFF' : '333333';
  const borderColor = 'CCCCCC';

  const makeRow = (label, value) => new TableRow({
    children: [
      new TableCell({
        shading: { fill: bgColor },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
          left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
          right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
        },
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, color: textColor, size: 22 })]
          })
        ]
      }),
      new TableCell({
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
          left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
          right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: value || 'No especificado', color: '333333', size: 22 })]
          })
        ]
      })
    ]
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      makeRow('Fecha', meeting.date),
      makeRow('Participantes', meeting.participants),
      makeRow('Área', (meeting.area || 'IT') + (meeting.business_unit ? ` | ${meeting.business_unit}` : '')),
      makeRow('Cliente', meeting.client)
    ]
  });
}

function createActionItemsTable(meeting, isAtlascoreStyle) {
  const headerBgColor = isAtlascoreStyle ? '0B3A42' : 'F0F0F0';
  const headerTextColor = isAtlascoreStyle ? 'FFFFFF' : '333333';
  const borderColor = 'CCCCCC';

  const thead = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        shading: { fill: headerBgColor },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        borders: { top: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, left: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, right: { style: BorderStyle.SINGLE, size: 4, color: borderColor } },
        width: { size: 65, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: 'Acciones', bold: true, color: headerTextColor, size: 22 })] })]
      }),
      new TableCell({
        shading: { fill: headerBgColor },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        borders: { top: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, left: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, right: { style: BorderStyle.SINGLE, size: 4, color: borderColor } },
        width: { size: 20, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: 'Responsable', bold: true, color: headerTextColor, size: 22 })] })]
      }),
      new TableCell({
        shading: { fill: headerBgColor },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        borders: { top: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, left: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, right: { style: BorderStyle.SINGLE, size: 4, color: borderColor } },
        width: { size: 15, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: 'Prioridad', bold: true, color: headerTextColor, size: 22 })] })]
      })
    ]
  });

  const rows = [thead];

  if (meeting.action_items && meeting.action_items.length > 0) {
    meeting.action_items.forEach((a, i) => {
      const rowBg = isAtlascoreStyle ? (i % 2 === 0 ? 'FFFFFF' : 'F9F9F9') : 'FFFFFF';
      rows.push(new TableRow({
        children: [
          new TableCell({
            shading: { fill: rowBg },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            borders: { top: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, left: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, right: { style: BorderStyle.SINGLE, size: 4, color: borderColor } },
            children: [new Paragraph({ children: [new TextRun({ text: a.action, color: '333333', size: 22 })] })]
          }),
          new TableCell({
            shading: { fill: rowBg },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            borders: { top: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, left: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, right: { style: BorderStyle.SINGLE, size: 4, color: borderColor } },
            children: [new Paragraph({ children: [new TextRun({ text: a.owner || 'No asignado', color: '333333', size: 22 })] })]
          }),
          new TableCell({
            shading: { fill: rowBg },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            borders: { top: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, left: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, right: { style: BorderStyle.SINGLE, size: 4, color: borderColor } },
            children: [new Paragraph({ children: [new TextRun({ text: a.priority || 'Media', color: '333333', size: 22 })] })]
          })
        ]
      }));
    });
  } else {
    rows.push(new TableRow({
      children: [
        new TableCell({
          columnSpan: 3,
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          borders: { top: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, left: { style: BorderStyle.SINGLE, size: 4, color: borderColor }, right: { style: BorderStyle.SINGLE, size: 4, color: borderColor } },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No hay acciones registradas.', color: '666666', size: 22 })] })]
        })
      ]
    }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows
  });
}

function createSignatureBlock(userName, isAtlascoreStyle) {
  if (isAtlascoreStyle) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.SINGLE, size: 12, color: '0B3A42' } },
              width: { size: 30, type: WidthType.PERCENTAGE },
              margins: { right: 200 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: Buffer.from(getBase64Data(SIGNATURE_LOGO_BASE64), 'base64'),
                      transformation: { width: 110, height: 110 }
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
              margins: { left: 200 },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'ATLASCORE IT SERVICES S.A.S.', bold: true, color: '0B3A42', size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: 'CUIT: 30-71905817-1', size: 20, color: '333333' })] }),
                new Paragraph({ children: [new TextRun({ text: 'Matrícula: 44300-A', size: 20, color: '333333' })] }),
                new Paragraph({ children: [new TextRun({ text: 'Domicilio legal: Córdoba, Argentina', size: 20, color: '333333' })] }),
                new Paragraph({ children: [new TextRun({ text: 'contacto@atlascore.com.ar', size: 20, color: '333333' })] }),
                new Paragraph({ children: [new TextRun({ text: 'www.atlascore.com.ar', bold: true, color: '207268', size: 20 })] }),
              ]
            })
          ]
        })
      ]
    });
  } else {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.SINGLE, size: 12, color: '0B3A42' } },
              width: { size: 15, type: WidthType.PERCENTAGE },
              margins: { top: 200, right: 200 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: Buffer.from(getBase64Data(SIGNATURE_LOGO_BASE64), 'base64'),
                      transformation: { width: 50, height: 50 }
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
              margins: { top: 200, left: 200 },
              children: [
                new Paragraph({ children: [new TextRun({ text: userName || 'Usuario', bold: true, color: '0B3A42', size: 24 })] }),
                new Paragraph({ children: [new TextRun({ text: '| Atlascore | ', size: 18, color: '666666' }), new TextRun({ text: 'www.atlascore.com.ar', size: 18, color: '207268' })] }),
              ]
            })
          ]
        })
      ]
    });
  }
}

async function generateDocx(meeting, userName, isAtlascoreStyle) {
  const children = [];

  // Header Table
  const headerRows = [];
  if (isAtlascoreStyle) {
    headerRows.push(new TableRow({
      children: [
        new TableCell({
          shading: { fill: '0B3A42' },
          borders: {
            top: { style: BorderStyle.NIL },
            left: { style: BorderStyle.NIL },
            right: { style: BorderStyle.NIL },
            bottom: { style: BorderStyle.SINGLE, size: 12, color: '207268' }
          },
          margins: { top: 150, bottom: 150, left: 200, right: 200 },
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: Buffer.from(getBase64Data(HEADER_LOGO_BASE64), 'base64'),
                  transformation: { width: 160, height: 32 }
                })
              ]
            })
          ]
        })
      ]
    }));
  } else {
    headerRows.push(new TableRow({
      children: [
        new TableCell({
          shading: { fill: 'FFFFFF' },
          borders: {
            top: { style: BorderStyle.NIL },
            left: { style: BorderStyle.NIL },
            right: { style: BorderStyle.NIL },
            bottom: { style: BorderStyle.SINGLE, size: 12, color: 'CCCCCC' }
          },
          margins: { top: 150, bottom: 150, left: 200, right: 200 },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Minuta de Reunión', bold: true, color: '333333', size: 36 })
              ]
            })
          ]
        })
      ]
    }));
  }

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
    rows: headerRows
  });
  
  children.push(headerTable);
  children.push(new Paragraph({ text: '' })); // Spacer

  // Title
  if (isAtlascoreStyle) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'MINUTA DE REUNIÓN', bold: true, size: 36, color: '0B3A42' })]
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: meeting.title || '', size: 28, color: '0B3A42' })]
    }));
  } else {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Estimados, ¿Cómo se encuentran? ¡Esperamos que muy bien!', bold: true, size: 24, color: '333333' })]
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: `Ante todo, les agradecemos el tiempo que nos brindaron en la reunión del día ${meeting.date}. A continuación les compartimos una breve minuta de lo conversado y sus próximos accionables.`, size: 24, color: '333333' })]
    }));
  }
  children.push(new Paragraph({ text: '' }));

  // Info Table
  children.push(createMetaTable(meeting, isAtlascoreStyle));
  children.push(new Paragraph({ text: '' }));

  // Summary
  if (isAtlascoreStyle) {
    children.push(createSectionHeader('Resumen Ejecutivo', isAtlascoreStyle));
    children.push(new Paragraph({ text: '' }));
    children.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: meeting.summary || 'No se especificó resumen.', size: 24, color: '333333' })]
    }));
    children.push(new Paragraph({ text: '' }));
  }

  // Topics
  if (isAtlascoreStyle || meeting.topics) {
    children.push(createSectionHeader('Temas Tratados', isAtlascoreStyle));
    children.push(new Paragraph({ text: '' }));
    
    if (meeting.topics && meeting.topics.length > 0) {
      meeting.topics.forEach(t => {
        children.push(new Paragraph({
          text: t,
          bullet: { level: 0 },
          style: 'Normal'
        }));
      });
    } else {
      children.push(new Paragraph({
        text: 'No hay temas específicos.',
        bullet: { level: 0 },
        style: 'Normal'
      }));
    }
    children.push(new Paragraph({ text: '' }));
  }

  // Decisions
  if (isAtlascoreStyle && meeting.decisions && meeting.decisions.length > 0) {
    children.push(createSectionHeader('Decisiones', isAtlascoreStyle));
    children.push(new Paragraph({ text: '' }));
    meeting.decisions.forEach(d => {
      children.push(new Paragraph({ text: d, bullet: { level: 0 } }));
    });
    children.push(new Paragraph({ text: '' }));
  }

  // Risks
  if (isAtlascoreStyle && meeting.risks && meeting.risks.length > 0) {
    children.push(createSectionHeader('Riesgos', isAtlascoreStyle));
    children.push(new Paragraph({ text: '' }));
    meeting.risks.forEach(r => {
      children.push(new Paragraph({ text: r, bullet: { level: 0 } }));
    });
    children.push(new Paragraph({ text: '' }));
  }

  // Custom Notes
  if (meeting.custom_notes) {
    children.push(createSectionHeader('Notas y Comentarios Extra', isAtlascoreStyle));
    children.push(new Paragraph({ text: '' }));
    const lines = meeting.custom_notes.split('\n');
    lines.forEach(l => {
      children.push(new Paragraph({ text: l, size: 24, color: '333333' }));
    });
    children.push(new Paragraph({ text: '' }));
  }

  // Action Items
  children.push(createSectionHeader(isAtlascoreStyle ? 'Plan de Acción' : 'Próximos accionables', isAtlascoreStyle));
  children.push(new Paragraph({ text: '' }));
  
  if (isAtlascoreStyle) {
    children.push(createActionItemsTable(meeting, isAtlascoreStyle));
  } else {
    if (meeting.action_items && meeting.action_items.length > 0) {
      meeting.action_items.forEach(a => {
        children.push(new Paragraph({ text: a.action, bullet: { level: 0 }, bold: true }));
        children.push(new Paragraph({ text: `¿Quién? ${a.owner}`, bullet: { level: 1 } }));
        children.push(new Paragraph({ text: `¿Cuándo? ${a.due_date}`, bullet: { level: 1 } }));
      });
    } else {
      children.push(new Paragraph({ text: 'No hay próximos pasos registrados.', bullet: { level: 0 } }));
    }
  }
  
  children.push(new Paragraph({ text: '' }));
  
  if (!isAtlascoreStyle) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Desde ya quedamos atentos y agradecidos del feedback que nos puedan dar al respecto. Ante cualquier consulta o comentario, estamos a disposición.', size: 24, color: '333333' })]
    }));
    children.push(new Paragraph({ text: '' }));
  }

  // Signature
  children.push(createSignatureBlock(userName, isAtlascoreStyle));

  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generateDocx };
