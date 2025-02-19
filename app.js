const fs = require('fs');
const xlsx = require('xlsx');
const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

// Função para gerar um delay entre min e max minutos
function delay(min, max) {
    const time = Math.floor(Math.random() * (max - min + 1) + min) * 60000;
    return new Promise(resolve => setTimeout(resolve, time));
}

// Função para salvar os números em um arquivo JSON
async function saveNumbersLocally() {
    const workbook = xlsx.readFile('numeros.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    data.splice(0, 2); // Remove as duas primeiras linhas
    const phoneNumbers = new Set();

    data.forEach(row => {
        for (let i = 2; i < row.length; i += 3) {
            let phone = row[i]?.toString().trim();
            if (phone) {
                let cleanedPhone = phone.replace(/\D/g, ''); // Remove tudo que não for número
                if (cleanedPhone.length === 11) {
                    phoneNumbers.add(`+55${cleanedPhone}`);
                }
            }            
        }
    });

    const numbers = Array.from(phoneNumbers);
    
    // Armazena os números em um arquivo JSON
    fs.writeFileSync('numbers.json', JSON.stringify(numbers, null, 2));
    console.log('Números salvos localmente no arquivo numbers.json.');
}

// Função para verificar e enviar as mensagens
async function sendMessage() {
    const numbers = JSON.parse(fs.readFileSync('numbers.json'));

    // Carregar o estado de envio
    let sentNumbers = [];
    if (fs.existsSync('sent_numbers.json')) {
        sentNumbers = JSON.parse(fs.readFileSync('sent_numbers.json'));
    }

    // Filtrar os números que ainda não receberam mensagem
    const remainingNumbers = numbers.filter(phone => !sentNumbers.includes(phone));

    if (remainingNumbers.length === 0) {
        console.log('Todos os números já receberam mensagem.');
        return;
    }

    // Limitar a 150 mensagens por dia
    const numbersToSend = remainingNumbers.slice(0, 150);

    for (let phone of numbersToSend) {
        try {
            const message = await client.messages.create({
                to: `whatsapp:${phone}`,
                from: 'whatsapp:+554888364936',
                contentSid: 'HXe46894c4f65aa0d3b32013c6bc2b3429',
            });
            console.log('Mensagem enviada para:', phone, 'SID:', message.sid);

            // Adicionar o número enviado ao estado
            sentNumbers.push(phone);
        } catch (error) {
            console.error('Erro ao enviar mensagem para:', phone, error.message);
        }

        // Aguarda entre 5 e 8 minutos antes do próximo envio
        await delay(2, 5);
    }

    // Salvar os números enviados
    fs.writeFileSync('sent_numbers.json', JSON.stringify(sentNumbers, null, 2));
    console.log('Mensagens enviadas.');
}

// Executa as funções
saveNumbersLocally().then(() => sendMessage());
