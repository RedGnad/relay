function asContractAddress(address: string): `0x${string}` {
    if (!/^0x[0-9a-f]+$/i.test(address)) {
        throw new Error("Adresse de contrat invalide : " + address);
    }
    return address as `0x${string}`;
}

if (!process.env.CONTRACT_ADDRESS) {
    throw new Error("La variable d'environnement CONTRACT_ADDRESS est manquante");
}

export const CONTRACT_ADDRESS: `0x${string}` = asContractAddress(process.env.CONTRACT_ADDRESS);

// IMPORTANT : L'ABI doit être un tableau simple et non un tableau imbriqué.
export const CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "player",
                "type": "address"
            }
        ],
        "name": "click",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "score",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "player",
                "type": "address"
            }
        ],
        "name": "submitScore",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_relayer",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "relayer",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "scores",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];