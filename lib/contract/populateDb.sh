#!/bin/bash
for DATE in {01..30}
do
  for NAME in "Sudhindra" "Shrikanta" "Tanay" "Prafulla" "Nirvan" "Anbuchelvan" "Akshan" "Dhananjay" #"Amol" "Haresh" "Mandhatri" "Nirvan" "Edi" "Devya" "Rajendramohan" "Yoosuf" "Satvamohan" "Daruka" "Achindra" "Jaichand" "Yadavendra" "Vachan" "Anu" "Neelkanth" "Vachaspati" "Ramavatar" "Shrihari" "Shubhankar" "Vasistha" "Qutub" "Nalin" "Pravir" "Prasad" "Aachman" "Sevak" "Krishnamurthy" "Sujit" "Jalal" "Dhanraj" "Shatrughna" "Devadarshan" "Ekatan" "Nipun" "Omar" "Chakshu" "Ilesh" "Amol" "Hanuman" "Prasanna" "Shrigopal" "Avinash" "Girik" "Sopan" "Devdas" "Durjaya" "Bhaskar" "Nishant" "Kamalesh" "Jyotichandra" "Devadhipa" "Seemanti" "Ehimaya" "Gautami" "Rachna" "Ushakiran" "Shanta" "Vibhavari" "Ishika" "Nagina" "Mahi" "Mangla" "Jayashri" "Madhulekha" "Parvati" "Hafiza" "Prita" "Sarita" "Keertana" "Pramiti" "Priyamvada" "Tapasi" "Amani" "Swapnali" "Lalima" "Hasina" "Nishtha" "Kesar" "Beli" "Bhuvana" "Kanti" "Shreela" "Aruna" "Jayalakshmi" "Vijul" "Madhula" "Bulbul" "Vidhut" "Sunetra" "Yashawanthi" "Natun" "Sweta" "Saujanya" "Fajyaz" "Ipsita" "Saeeda" "Geeta" "Jyoti" "Pavana" "Ashima" "Anahita" "Shri" "Manjira" "Karuna" "Parnik" "Lona" "Binodini" "Ankitha" "Sadaf" "Poorvi" "Almas"
  do
    AADHAR=$(shuf -i 1000000000000000-9999999999999999 -n 1)
    EXIT_TIME=$(shuf -i 14-21 -n 1)
    COMP[0]="no"
    COMP[1]="yes"
    COMPLIANCE1=${COMP[$(shuf -i 0-1 -n 1)]}
    COMPLIANCE2=${COMP[$(shuf -i 0-1 -n 1)]}
    COMPLIANCE3=${COMP[$(shuf -i 0-1 -n 1)]}
    SUBCNAME[0]="Priyal Sharma"
    SUBCNAME[1]="Roshni Kumari"
    SUBCVPA[0]="psharma@upi"
    SUBCVPA[1]="roshnikumari@ybl"
    NUM=$(shuf -i 0-1 -n 1)
    SUBCONTRACTOR=${SUBCNAME[$NUM]}
    SUBCONRACTORVPA=${SUBCVPA[$NUM]}
    DATA="{\"name\": \"$NAME\", \"aadharNo\": $AADHAR, \"entryTime\": \"2017-10-${DATE}T10:00:00.000Z\", \"exitTime\": \"2017-10-${DATE}T$EXIT_TIME:00:00.000Z\", \"subContractorName\": \"$SUBCONTRACTOR\", \"subContractorVpa\": \"$SUBCONRACTORVPA\"}"
    COMMAND="curl -X POST -k -H \"Accept: Application/json\" -H \"Content-Type: application/json\" https://localhost:3000/contract/addEntry -d '$DATA'"
    echo $COMMAND
    eval $COMMAND
  done
done
