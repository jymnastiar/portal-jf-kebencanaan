// =========================================================================
// FILE 1: Kode.gs (RUANG MESIN SERVER / BACKEND)
// =========================================================================

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Portal Data Jabatan Fungsional Kebencanaan')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1'); 
}

// =========================================================================
// FUNGSI SETUP DATABASE OTOMATIS (Disesuaikan dengan format spreadsheet referensi)
// =========================================================================
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var headersPNS = [
    "NO", "NAMA", "NIP", "Gender", "ASAL INSTANSI", "STATUS PEGAWAI", 
    "GOL. RUANG / PANGKAT", "TMT PANGKAT", "JABATAN", "TMT JABATAN", 
    "STATUS", "KABUPATEN/KOTA", "UNIT KERJA", "BIDANG", "PENDIDIKAN TERAKHIR", 
    "PROGRAM STUDI", "NO HP", "ALAMAT EMAIL AKTIF", "DIKLAT PB YANG TELAH DIIKUTI ", 
    "PAK Terakhir", "Unggah SK Pengangkatan JF", "Unggah SK Pangkat Terakhir", 
    "Unggah SK Jabatan Terakhir", "Unggah PAK Terakhir", "Unggah Ijazah Pendidikan Terakhir", 
    "Unggah Sertifikat Diklat", "PERNYATAAN KEBENARAN DATA", "Unggah Sertifikat Diklat PB"
  ];

  var headersPPPK = [
    "NO", "NAMA", "NIP", "GENDER", "ASAL INSTANSI", "STATUS PEGAWAI", 
    "GOL. RUANG / PANGKAT", "TMT PANGKAT", "JABATAN", "TMT JABATAN", 
    "STATUS", "KABUPATEN/KOTA", "UNIT KERJA", "BIDANG", "TANGGAL LAHIR", 
    "PENDIDIKAN TERAKHIR", "PROGRAM STUDI", "NO HP", "ALAMAT EMAIL AKTIF", 
    "DIKLAT PB YANG TELAH DIIKUTI ", "PAK Terakhir", "Unggah SK Pengangkatan JF", 
    "Unggah SK Pangkat Terakhir", "Unggah SK Jabatan Terakhir", "Unggah PAK Terakhir", 
    "Unggah Ijazah Pendidikan Terakhir", "Unggah Sertifikat Diklat", "PERNYATAAN KEBENARAN DATA", 
    "Unggah Sertifikat Diklat PB"
  ];
  
  var daftarSheet = [
    {
      name: "Data_PNS",
      headers: headersPNS,
      dummy: [
        1, "Agus Sulistiyono, S.E., M.Si", "197604052009121001", "Laki-laki", "BNPB", "PNS", 
        "Pembina (IV/a)", "2022-04-01", "Analis Kebencanaan Ahli Madya", "2025-11-03", 
        "Pusat", "Pusat", "Deputi Bidang Penanganan Darurat BNPB", "Direktorat Penanganan Darurat Wilayah III", 
        "S2", "Manajemen Bencana", "081234567890", "agus.s@bnpb.go.id", "Sudah", 
        "150", "", "", "", "", "", "", "YA", ""
      ]
    },
    {
      name: "Data_PPPK",
      headers: headersPPPK,
      dummy: [
        1, "Ade Sevrita Grace, S.Ars.", "200005012023212003", "Perempuan", "BNPB", "PPPK", 
        "IX", "2023-01-01", "Analis Kebencanaan Ahli Pertama", "2023-01-01", 
        "Pusat", "Pusat", "Pusat Pembinaan Jabatan Fungsional Kebencanaan BNPB", "-", "2000-05-01", 
        "S1", "Arsitektur", "081298765432", "ade.grace@bnpb.go.id", "Sudah", 
        "100", "", "", "", "", "", "", "YA", ""
      ]
    },
    {
      name: "Data_Double",
      headers: headersPNS,
      dummy: null
    }
  ];

  daftarSheet.forEach(function(item) {
    var sheet = ss.getSheetByName(item.name);
    if (!sheet) {
      sheet = ss.insertSheet(item.name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(item.headers);
      sheet.getRange(1, 1, 1, item.headers.length).setFontWeight("bold").setBackground("#e9ecef");
      if (item.dummy) {
        sheet.appendRow(item.dummy);
      }
    }
  });

  return "Database berhasil disesuaikan dengan format spreadsheet referensi!";
}



function include(namaFile) {
  try { return HtmlService.createHtmlOutputFromFile(namaFile).getContent(); } 
  catch (err) { return ""; }
}

function getDashboardData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  function countValidRows(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return 0;
    var data = sheet.getDataRange().getDisplayValues();
    var count = 0; 
    for (var i = 1; i < data.length; i++) {
      var namaVal = data[i][1] ? data[i][1].toString().trim() : "";
      if (namaVal !== "") count++;
    }
    return count;
  }
  return { pns: countValidRows('Data_PNS'), pppk: countValidRows('Data_PPPK') };
}

function getFormattedData(type) {
  if (!type) type = 'PNS';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Membaca tab data rapi
  var sheetName = type === 'PNS' ? 'Data_PNS' : 'Data_PPPK';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 2) return [];
  
  var allData = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  var headers = allData[0].map(function(h) { return h.toString().toUpperCase().trim(); });
  
  var idxNo = headers.indexOf("NO");
  var idxNama = headers.indexOf("NAMA");
  var idxNip = headers.findIndex(h => h === "NIP" || h === "NI PPPK" || h === "NRP" || h === "NIP / NRP");
  var idxJabatan = headers.indexOf("JABATAN");
  var idxStatus = headers.indexOf("STATUS"); 
  var idxGender = headers.findIndex(h => h.includes("JENIS KELAMIN") || h.includes("GENDER") || h === "J/K" || h === "L/P");
  var idxUnit = headers.findIndex(h => h.includes("UNIT"));
  var idxPangkat = headers.findIndex(h => h.includes("PANGKAT") || h.includes("GOLONGAN") || h.includes("GRADE"));
  var idxTmtPangkat = headers.findIndex(h => h.includes("TMT PANGKAT") || h.includes("TMT. PANGKAT"));
  var idxTmtJabatan = headers.findIndex(h => h.includes("TMT JABATAN") || h.includes("TMT. JABATAN"));
  var idxEselonStatus = headers.indexOf("ESELON");

  var cleanData = [];
  
  for (var r = 1; r < allData.length; r++) {
    var row = allData[r];
    if (!row[idxNama] || row[idxNama] === "") continue;

    cleanData.push({
      nama: (idxNama > -1) ? row[idxNama] : "-", 
      nip: (idxNip > -1) ? row[idxNip] : "-", 
      pangkat: (idxPangkat > -1) ? row[idxPangkat] : "-",
      jabatan: (idxJabatan > -1) ? row[idxJabatan] : "-", 
      jenis_jabatan: (idxStatus > -1) ? row[idxStatus] : "-", 
      jenis_kelamin: (idxGender > -1) ? row[idxGender] : "-", 
      unit_kerja: (idxUnit > -1) ? row[idxUnit] : "-",
      tmt_pangkat: (idxTmtPangkat > -1) ? row[idxTmtPangkat] : "-", 
      tmt_jabatan: (idxTmtJabatan > -1) ? row[idxTmtJabatan] : "-",
      eselon: (idxEselonStatus > -1) ? row[idxEselonStatus] : "-"
    });
  }
  return cleanData;
}

function userHeartbeat(uniqueId) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) return null; 
  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = "ACTIVE_USERS_V2";
    var users = JSON.parse(cache.get(cacheKey) || "{}");
    var now = new Date().getTime();
    users[uniqueId] = now;
    var activeCount = 0; var cleanUsers = {};
    for (var id in users) { if (now - users[id] < 300000) { cleanUsers[id] = users[id]; activeCount++; } }
    cache.put(cacheKey, JSON.stringify(cleanUsers), 600);
    return activeCount;
  } catch (e) { return 1; } finally { lock.releaseLock(); }
}

function ambilDataKombinasiGanda(nipCari, hpCari) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const daftarSheet = ["Data_PNS", "Data_PPPK"]; // Mencari di tab data rapi
  if (!nipCari || !hpCari) return null;
  
  let nipTarget = nipCari.toString().replace(/\s+/g, '').trim().toLowerCase();
  let hpTarget = hpCari.toString().replace(/\s+/g, '').trim().toLowerCase();
  let hpTargetTanpaNol = hpTarget.startsWith('0') ? hpTarget.substring(1) : hpTarget;
  
  for (let s = 0; s < daftarSheet.length; s++) {
    let namaSheet = daftarSheet[s];
    let sheet = ss.getSheetByName(namaSheet);
    if (!sheet) continue;
    let data = sheet.getDataRange().getDisplayValues(); 
    if (data.length < 2) continue; 
    
    let headers = data[0].map(h => h.toString().toUpperCase().trim());
    
    let hNama = headers.indexOf("NAMA");
    let hNip = headers.findIndex(h => h === "NIP" || h === "NI PPPK" || h === "NRP");
    let hHp = headers.indexOf("NO HP");
    if (hNip === -1 || hHp === -1) continue; 
    
    let hAsal = headers.indexOf("ASAL INSTANSI");
    let hPangkat = headers.findIndex(h => h.includes("PANGKAT") || h.includes("GOLONGAN"));
    let hTmtPangkat = headers.findIndex(h => h.includes("TMT PANGKAT"));
    let hJabatan = headers.indexOf("JABATAN");
    let hTmtJabatan = headers.findIndex(h => h.includes("TMT JABATAN"));
    let hWilayah = headers.indexOf("STATUS"); 
    let hKabKota = headers.indexOf("KABUPATEN/KOTA");
    let hUnit = headers.findIndex(h => h.includes("UNIT"));
    let hBidang = headers.indexOf("BIDANG");
    let hTglLahir = headers.indexOf("TANGGAL LAHIR");
    let hPendidikan = headers.indexOf("PENDIDIKAN TERAKHIR");
    let hProdi = headers.indexOf("PROGRAM STUDI");
    let hEmail = headers.findIndex(h => h.includes("EMAIL"));
    let hDiklat = headers.findIndex(h => h.includes("DIKLAT PB"));
    let hPak = headers.findIndex(h => h.includes("PAK TERAKHIR"));
    
    let hSkPengangkatan = headers.findIndex(h => h.includes("SK PENGANGKATAN"));
    let hSkPangkat = headers.findIndex(h => h.includes("SK PANGKAT"));
    let hSkJabatan = headers.findIndex(h => h.includes("SK JABATAN"));
    let hUnggahPak = headers.findIndex(h => h.includes("UNGGAH PAK") || h.includes("UNGGAH PENILAIAN"));
    let hIjazah = headers.findIndex(h => h.includes("IJAZAH"));
    let hSertifikat = headers.findIndex(h => h.includes("SERTIFIKAT DIKLAT") && !h.includes("PB"));
    
    for (let i = 1; i < data.length; i++) {
      let barisData = data[i];
      if (!barisData) continue;
      
      let nipDiSheet = barisData[hNip] ? barisData[hNip].toString().replace(/\s+/g, '').trim().toLowerCase() : "";
      let hpDiSheet = barisData[hHp] ? barisData[hHp].toString().replace(/\s+/g, '').trim().toLowerCase() : "";
      if (nipDiSheet === "") continue;
      
      if ((nipDiSheet === nipTarget) && (hpDiSheet === hpTarget || hpDiSheet === hpTargetTanpaNol || hpDiSheet.endsWith(hpTargetTanpaNol))) {
        
        var formatTglInput = function(val) {
          if (!val || val.toString().trim() === "" || val.toString().trim() === "-") return "";
          let strVal = val.toString().trim();
          if (strVal.includes('/')) { let parts = strVal.split('/'); if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; }
          if (strVal.includes('-')) { let parts = strVal.split('-'); if (parts.length === 3) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`; }
          return strVal;
        };
        
        const getV = (idx) => (idx > -1 && barisData[idx]) ? barisData[idx] : "";
        
        return {
          baris: i + 1, namaSheet: namaSheet, 
          nama: getV(hNama), nip: getV(hNip), asalInstansi: getV(hAsal), 
          pangkat: getV(hPangkat), tmtPangkat: formatTglInput(getV(hTmtPangkat)),
          jabatan: getV(hJabatan), tmtJabatan: formatTglInput(getV(hTmtJabatan)), 
          wilayahKerja: getV(hWilayah), kabupatenKota: getV(hKabKota), unitKerja: getV(hUnit),
          bidangKerja: getV(hBidang), tanggalLahir: formatTglInput(getV(hTglLahir)), 
          pendidikanTerakhir: getV(hPendidikan), programStudi: getV(hProdi),
          noHp: getV(hHp), email: getV(hEmail), diklat: getV(hDiklat), pakTerakhir: getV(hPak),
          linkSkPengangkatan: getV(hSkPengangkatan), linkSkPangkat: getV(hSkPangkat), 
          linkSkJabatan: getV(hSkJabatan), linkPak: getV(hUnggahPak), 
          linkIjazah: getV(hIjazah), linkSertifikat: getV(hSertifikat)
        }; 
      } 
    } 
  } 
  return null; 
}

function unggahFileMultiKomponen(fileData, nipPegawai, jenisDokumen) {
  try {
    if (!nipPegawai || nipPegawai.toString().trim() === "") throw new Error("NIP kosong.");
    let idFolderTujuan = "1MoGgzVZWC9xXqbApH8znm1NYwpOWiFNF"; // ID FOLDER GOOGLE DRIVE ANDA
    const folder = DriveApp.getFolderById(idFolderTujuan);
    const bytes = Utilities.base64Decode(fileData.data);
    let namaFileBaru = `${jenisDokumen}_${nipPegawai}_${fileData.name}`;
    const blob = Utilities.newBlob(bytes, fileData.type, namaFileBaru);
    const file = folder.createFile(blob);
    return file.getUrl();
  } catch (error) { throw new Error("Gagal simpan ke Google Drive: " + error.toString()); }
}

function updateDataPegawaiMassal(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(payload.namaSheet);
    if (!sheet) return "Gagal: Lembar data tidak ditemukan.";
    
    let r = parseInt(payload.nomorBaris);
    let lastCol = sheet.getLastColumn();
    let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => h.toString().toUpperCase().trim());
    
    const setV = (headerName, value, isLink = false) => {
        let idx = headers.indexOf(headerName);
        if (idx === -1 && headerName === "NIP") idx = headers.findIndex(h => h === "NI PPPK" || h === "NRP");
        if (idx === -1 && headerName === "PANGKAT") idx = headers.findIndex(h => h.includes("PANGKAT") || h.includes("GOLONGAN"));
        if (idx === -1 && headerName === "STATUS") idx = headers.indexOf("STATUS");
        if (idx === -1 && headerName === "UNIT KERJA") idx = headers.findIndex(h => h.includes("UNIT"));
        if (idx === -1 && headerName === "EMAIL") idx = headers.findIndex(h => h.includes("EMAIL"));
        if (idx === -1 && headerName === "DIKLAT PB") idx = headers.findIndex(h => h.includes("DIKLAT PB"));
        if (idx === -1 && headerName === "PAK TERAKHIR") idx = headers.findIndex(h => h.includes("PAK TERAKHIR"));
        
        if (isLink) {
            if (headerName === "SK_PENGANGKATAN") idx = headers.findIndex(h => h.includes("SK PENGANGKATAN"));
            if (headerName === "SK_PANGKAT") idx = headers.findIndex(h => h.includes("SK PANGKAT"));
            if (headerName === "SK_JABATAN") idx = headers.findIndex(h => h.includes("SK JABATAN"));
            if (headerName === "UNGGAH PAK") idx = headers.findIndex(h => h.includes("UNGGAH PAK") || h.includes("UNGGAH PENILAIAN"));
            if (headerName === "IJAZAH") idx = headers.findIndex(h => h.includes("IJAZAH"));
            if (headerName === "SERTIFIKAT") idx = headers.findIndex(h => h.includes("SERTIFIKAT DIKLAT") && !h.includes("PB"));
        }
        if (idx > -1 && value) { sheet.getRange(r, idx + 1).setValue(value); }
    };

    setV("NAMA", payload.nama);
    setV("ASAL INSTANSI", payload.asalInstansi);
    setV("PANGKAT", payload.pangkat);
    setV("TMT PANGKAT", payload.tmtPangkat);
    setV("JABATAN", payload.jabatan);
    setV("TMT JABATAN", payload.tmtJabatan);
    setV("BIDANG", payload.bidangKerja);
    setV("TANGGAL LAHIR", payload.tanggalLahir);
    setV("PENDIDIKAN TERAKHIR", payload.pendidikanTerakhir);
    setV("PROGRAM STUDI", payload.programStudi);
    setV("EMAIL", payload.email);
    setV("DIKLAT PB", payload.diklat);
    setV("PAK TERAKHIR", payload.pakTerakhir);
    
    if (payload.linkSkPengangkatan) setV("SK_PENGANGKATAN", payload.linkSkPengangkatan, true);
    if (payload.linkSkPangkat) setV("SK_PANGKAT", payload.linkSkPangkat, true);
    if (payload.linkSkJabatan) setV("SK_JABATAN", payload.linkSkJabatan, true);
    if (payload.linkPak) setV("UNGGAH PAK", payload.linkPak, true);
    if (payload.linkIjazah) setV("IJAZAH", payload.linkIjazah, true);
    if (payload.linkSertifikat) setV("SERTIFIKAT", payload.linkSertifikat, true);
    
    return "SUKSES";
  } catch (error) { return "Gagal memperbarui baris: " + error.toString(); }
}

function ambilKontenHtml(namaFile) {
  try {
    if (!namaFile || namaFile === undefined || namaFile === "undefined") namaFile = "Index";
    return HtmlService.createTemplateFromFile(namaFile).evaluate().getContent();
  } catch (err) { throw new Error("Gagal memuat file '" + namaFile + "'. Detail: " + err.toString()); }
}

// =========================================================================
// FUNGSI 10: ROBOT PEMINDAH OTOMATIS (DENGAN KARANTINA NIP GANDA)
// =========================================================================
function pindahkanDataOtomatis(e) {
  if (!e) return;
  var sheetSumber = e.range.getSheet();
  var namaSheetSumber = sheetSumber.getName();
  
  var namaSheetTujuan = "";
  if (namaSheetSumber === "PNS" || namaSheetSumber.includes("Form Responses PNS")) namaSheetTujuan = "Data_PNS";
  else if (namaSheetSumber === "PPPK" || namaSheetSumber.includes("Form Responses PPPK")) namaSheetTujuan = "Data_PPPK";
  else return; // Abaikan jika bukan dari sheet form

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetTujuan = ss.getSheetByName(namaSheetTujuan);
  if (!sheetTujuan) return;

  var headersSumber = sheetSumber.getRange(1, 1, 1, sheetSumber.getLastColumn()).getValues()[0].map(h => h.toString().toUpperCase().replace(/:/g, '').trim());
  var rowData = e.values; 

  // --- ATURAN 1: Tangkap Wilayah Kerja untuk PUSAT ---
  var idxWilayah = headersSumber.findIndex(h => h === "WILAYAH KERJA" || h === "STATUS");
  var wilayahKerja = (idxWilayah > -1 && rowData[idxWilayah]) ? rowData[idxWilayah].toString().trim().toUpperCase() : "";

  // 1. Merangkum Kabupaten/Kota yang berceceran
  var kabKotaArr = [];
  headersSumber.forEach((h, i) => {
    if (h.includes("KAB/KOTA") || h === "KABUPATEN/KOTA") kabKotaArr.push(i);
  });
  
  var kabKotaFix = "-";
  for (var k = 0; k < kabKotaArr.length; k++) {
    if (rowData[kabKotaArr[k]] && rowData[kabKotaArr[k]].trim() !== "") {
      kabKotaFix = rowData[kabKotaArr[k]].trim();
      break;
    }
  }

  if (wilayahKerja === "PUSAT" || wilayahKerja === "BNPB PUSAT") {
    kabKotaFix = "BNPB PUSAT";
  }

  // --- ATURAN 3: Otomatisasi Unit Kerja untuk BPBD ---
  var idxAsalInstansi = headersSumber.indexOf("ASAL INSTANSI");
  var asalInstansi = (idxAsalInstansi > -1 && rowData[idxAsalInstansi]) ? rowData[idxAsalInstansi].toString().trim().toUpperCase() : "";

  var idxKedeputian = headersSumber.indexOf("KEDEPUTIAN");
  var idxUnit = headersSumber.findIndex(h => h === "UNIT KERJA" || h === "UNIT");
  var kedeputianStr = (idxKedeputian > -1 && rowData[idxKedeputian]) ? rowData[idxKedeputian].trim() : "";
  var unitStr = (idxUnit > -1 && rowData[idxUnit]) ? rowData[idxUnit].trim() : "";
  
  var unitKerjaFix = "-";
  
  if (asalInstansi.includes("BPBD")) {
    if (kabKotaFix !== "-" && kabKotaFix !== "BNPB PUSAT") {
        unitKerjaFix = "BPBD " + kabKotaFix; 
    } else if (wilayahKerja !== "" && wilayahKerja !== "PUSAT" && wilayahKerja !== "BNPB PUSAT") {
        unitKerjaFix = "BPBD " + wilayahKerja; 
    } else {
        unitKerjaFix = asalInstansi; 
    }
  } else {
    if (kedeputianStr && unitStr) unitKerjaFix = kedeputianStr + " > " + unitStr;
    else if (kedeputianStr) unitKerjaFix = kedeputianStr;
    else if (unitStr) unitKerjaFix = unitStr;
  }

  // 3. Menyiapkan baris baru untuk ditaruh di Data_PNS / Data_PPPK
  var headersTujuan = sheetTujuan.getRange(1, 1, 1, sheetTujuan.getLastColumn()).getValues()[0].map(h => h.toString().toUpperCase().trim());
  var newRow = new Array(headersTujuan.length).fill("");
  
  for (var t = 1; t < headersTujuan.length; t++) {
    var headerT = headersTujuan[t];
    
    if (headerT === "KABUPATEN/KOTA" || headerT === "STATUS") { newRow[t] = kabKotaFix; continue; }
    if (headerT === "UNIT KERJA" || headerT === "UNIT") { newRow[t] = unitKerjaFix; continue; }
    
    var idxS = headersSumber.indexOf(headerT);
    if (idxS === -1 && headerT === "NIP") idxS = headersSumber.findIndex(h => h === "NIP" || h === "NI PPPK" || h === "NRP");
    if (idxS === -1 && (headerT === "GENDER" || headerT === "JENIS KELAMIN")) idxS = headersSumber.findIndex(h => h.includes("JENIS KELAMIN") || h.includes("GENDER") || h === "J/K" || h === "L/P");
    
    if (idxS === -1 && headerT.includes("SK PENGANGKATAN")) idxS = headersSumber.findIndex(h => h.includes("SK PENGANGKATAN"));
    if (idxS === -1 && headerT.includes("SK PANGKAT")) idxS = headersSumber.findIndex(h => h.includes("SK PANGKAT"));
    if (idxS === -1 && headerT.includes("SK JABATAN")) idxS = headersSumber.findIndex(h => h.includes("SK JABATAN"));
    if (idxS === -1 && headerT.includes("UNGGAH PAK")) idxS = headersSumber.findIndex(h => h.includes("UNGGAH PAK") || h.includes("UNGGAH PENILAIAN"));
    if (idxS === -1 && headerT.includes("IJAZAH")) idxS = headersSumber.findIndex(h => h.includes("IJAZAH"));
    if (idxS === -1 && headerT.includes("SERTIFIKAT DIKLAT")) idxS = headersSumber.findIndex(h => h.includes("SERTIFIKAT DIKLAT") && !h.includes("PB"));

    if (idxS > -1 && rowData[idxS]) {
       if (headerT === "ASAL INSTANSI") {
           newRow[t] = rowData[idxS].toString().trim().toUpperCase();
       } else {
           newRow[t] = rowData[idxS];
       }
    }
  }

  // ====================================================================
  // MESIN DETEKSI NIP GANDA (DIARAHKAN KE TAB Data_Double)
  // ====================================================================
  var idxNipTujuan = headersTujuan.findIndex(h => h === "NIP" || h === "NI PPPK" || h === "NRP");
  var nipBaru = (idxNipTujuan > -1) ? newRow[idxNipTujuan].toString().replace(/\s+/g, '').trim() : "";
  
  var isDouble = false;
  
  if (nipBaru !== "" && nipBaru !== "-") {
    // Cek duplikasi di tab data utama yang sedang dituju
    var dataLama = sheetTujuan.getDataRange().getValues();
    for (var r = 1; r < dataLama.length; r++) {
      var nipLama = dataLama[r][idxNipTujuan] ? dataLama[r][idxNipTujuan].toString().replace(/\s+/g, '').trim() : "";
      if (nipLama === nipBaru) {
        isDouble = true;
        break; 
      }
    }
    
    // Cek juga apakah sudah pernah masuk ke tab Data_Double sebelumnya
    if (!isDouble) {
      var sheetDoubleCheck = ss.getSheetByName("Data_Double");
      if (sheetDoubleCheck && sheetDoubleCheck.getLastRow() > 1) {
        var dataDouble = sheetDoubleCheck.getDataRange().getValues();
        for (var d = 1; d < dataDouble.length; d++) {
          var nipDouble = dataDouble[d][idxNipTujuan] ? dataDouble[d][idxNipTujuan].toString().replace(/\s+/g, '').trim() : "";
          if (nipDouble === nipBaru) {
            isDouble = true;
            break;
          }
        }
      }
    }
  }

  // Keputusan Eksekusi Akhir
  if (isDouble) {
    // Jika NIP sudah ada, lempar ke tab Data_Double milik Anda
    var sheetGanda = ss.getSheetByName("Data_Double");
    if (sheetGanda) {
      sheetGanda.appendRow(newRow);
    }
  } else {
    // Jika bersih/baru, masukkan ke tab Data_PNS atau Data_PPPK utama
    sheetTujuan.appendRow(newRow);
  }
}

// =========================================================================
// FUNGSI 11: REKAP KEBUTUHAN VS KETERISIAN FORMASI JF (+ SINKRON KE EXCEL)
// =========================================================================
function getRekapKebutuhan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetFormasi = ss.getSheetByName("Formasi_JF");
  var sheetGabungan = ss.getSheetByName("Data_Gabungan");
  if (!sheetFormasi || !sheetGabungan) return [];

  var dataGabungan = sheetGabungan.getDataRange().getValues();
  var headersGab = dataGabungan[0].map(h => h.toString().toUpperCase().trim());
  var idxUnit = headersGab.indexOf("UNIT KERJA");
  var idxJabatan = headersGab.indexOf("JABATAN");
  
  var pegawaiData = [];
  for (var i = 1; i < dataGabungan.length; i++) {
    pegawaiData.push({
      unit: dataGabungan[i][idxUnit] ? dataGabungan[i][idxUnit].toString().toUpperCase() : "",
      jabatan: dataGabungan[i][idxJabatan] ? dataGabungan[i][idxJabatan].toString().toUpperCase() : ""
    });
  }

  var dataFormasi = sheetFormasi.getDataRange().getValues();
  var hasilSementara = [];
  
  // >>> WADAH BARU: Untuk menampung angka Aktual yang akan ditulis ke Excel
  var arrayUpdateKeExcel = [];

  for (var r = 3; r < dataFormasi.length; r++) {
    var row = dataFormasi[r];
    var namaInstansi = (row[2] && row[2].toString().trim() !== "") ? row[2].toString().trim() : (row[1] ? row[1].toString().trim() : "");
    
    if (namaInstansi === "" || namaInstansi.toUpperCase() === "NAN") {
      arrayUpdateKeExcel.push(["", "", "", ""]); // Kosongkan baris agar tidak merusak format excel
      continue;
    }

    var searchStr = namaInstansi.toUpperCase();
    if (searchStr.includes("PROVINSI") || searchStr.includes("KABUPATEN") || searchStr.includes("KOTA")) {
      if (!searchStr.startsWith("BPBD")) searchStr = "BPBD " + searchStr;
    } else if (searchStr.includes("DEPUTI") || searchStr.includes("PUSAT PEMBINAAN")) {
      if (!searchStr.endsWith("BNPB")) searchStr = searchStr + " BNPB";
    }

    var isiPertama = 0, isiMuda = 0, isiMadya = 0;
    for (var p = 0; p < pegawaiData.length; p++) {
      if (pegawaiData[p].unit.includes(searchStr)) {
        if (pegawaiData[p].jabatan.includes("PERTAMA")) isiPertama++;
        if (pegawaiData[p].jabatan.includes("MUDA")) isiMuda++;
        if (pegawaiData[p].jabatan.includes("MADYA")) isiMadya++;
      }
    }
    var isiTotal = isiPertama + isiMuda + isiMadya;

    var butuhPertama = parseInt(row[3]) || 0;
    var butuhMuda = parseInt(row[4]) || 0;
    var butuhMadya = parseInt(row[5]) || 0;
    var butuhTotal = butuhPertama + butuhMuda + butuhMadya;

    // >>> BARU: Simpan angka Aktual untuk ditulis ke Spreadsheet (Kolom H, I, J, K)
    if (butuhTotal === 0 && isiTotal === 0 && searchStr !== "BNPB") {
        arrayUpdateKeExcel.push(["", "", "", ""]); // Biarkan kosong jika tidak ada data
    } else {
        arrayUpdateKeExcel.push([isiPertama, isiMuda, isiMadya, isiTotal]);
    }

    if (butuhTotal === 0 && isiTotal === 0 && searchStr !== "BNPB") continue;

    hasilSementara.push({
      instansi: namaInstansi,
      b1: butuhPertama, i1: isiPertama,
      b2: butuhMuda, i2: isiMuda,
      b3: butuhMadya, i3: isiMadya,
      bt: butuhTotal, it: isiTotal
    });
  }

  // >>> BARU: Eksekusi Tulis Balik (Sinkronisasi) ke Excel secara otomatis
  // (Menulis ke Kolom 8 s/d 11 yaitu H, I, J, K secara massal)
  if (arrayUpdateKeExcel.length > 0) {
    sheetFormasi.getRange(4, 8, arrayUpdateKeExcel.length, 4).setValues(arrayUpdateKeExcel);
  }

  // --- LOGIKA GROUPING & PENJUMLAHAN BNPB ---
  var bnpbInduk = { instansi: "BNPB PUSAT", isParent: true, b1: 0, i1: 0, b2: 0, i2: 0, b3: 0, i3: 0, bt: 0, it: 0 };
  var anakBNPB = [];
  var dataBPBD = [];

  for (var i = 0; i < hasilSementara.length; i++) {
     var item = hasilSementara[i];
     var nm = item.instansi.toUpperCase();
     if (nm === "BNPB") continue; 

     if (nm.includes("DEPUTI") || nm.includes("PUSAT PEMBINAAN") || nm.includes("SEKRETARIAT") || nm.includes("INSPEKTORAT")) {
         bnpbInduk.b1 += item.b1; bnpbInduk.i1 += item.i1;
         bnpbInduk.b2 += item.b2; bnpbInduk.i2 += item.i2;
         bnpbInduk.b3 += item.b3; bnpbInduk.i3 += item.i3;
         bnpbInduk.bt += item.bt; bnpbInduk.it += item.it;
         
         item.isSubUnit = true; 
         item.s1 = item.i1 - item.b1; item.s2 = item.i2 - item.b2; item.s3 = item.i3 - item.b3; item.st = item.it - item.bt;
         anakBNPB.push(item);
     } else {
         item.isSubUnit = false;
         item.s1 = item.i1 - item.b1; item.s2 = item.i2 - item.b2; item.s3 = item.i3 - item.b3; item.st = item.it - item.bt;
         dataBPBD.push(item);
     }
  }

  bnpbInduk.s1 = bnpbInduk.i1 - bnpbInduk.b1;
  bnpbInduk.s2 = bnpbInduk.i2 - bnpbInduk.b2;
  bnpbInduk.s3 = bnpbInduk.i3 - bnpbInduk.b3;
  bnpbInduk.st = bnpbInduk.it - bnpbInduk.bt;

  return [bnpbInduk].concat(anakBNPB).concat(dataBPBD);
}

// =========================================================================
// FUNGSI 12: OTORISASI ADMIN & UPDATE STATUS KEPEGAWAIAN
// =========================================================================
var ADMIN_PASSWORD_PORTAL = "admin123"; // Password admin default (bisa diubah sesuai kebutuhan)

function verifyAdminPassword(inputPassword) {
  try {
    if (!inputPassword) return { valid: false };
    var isValid = (inputPassword.toString().trim() === ADMIN_PASSWORD_PORTAL);
    return { valid: isValid };
  } catch (e) {
    return { valid: false, message: e.toString() };
  }
}

function updateStatusPegawai(nip, type, statusBaru) {
  try {
    if (!nip || !statusBaru) throw new Error("Parameter NIP atau Status tidak lengkap.");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = (type === 'PPPK') ? 'Data_PPPK' : 'Data_PNS';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan.");

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2) throw new Error("Data di sheet kosong.");

    var allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = allData[0].map(function(h) { return h.toString().toUpperCase().trim(); });

    // Cari indeks kolom NIP
    var idxNip = headers.findIndex(function(h) { return h === "NIP" || h === "NI PPPK" || h === "NRP" || h === "NIP / NRP"; });
    if (idxNip === -1) throw new Error("Kolom NIP tidak ditemukan.");

    // Cari indeks kolom Status Pegawai
    var idxStatusPegawai = headers.findIndex(function(h) { return h === "STATUS PEGAWAI" || h === "STATUS_PEGAWAI"; });
    if (idxStatusPegawai === -1) {
      // Jika kolom status pegawai belum ada, gunakan kolom STATUS
      idxStatusPegawai = headers.indexOf("STATUS");
    }
    if (idxStatusPegawai === -1) throw new Error("Kolom Status Pegawai tidak ditemukan.");

    var nipCleanTarget = nip.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    var targetRow = -1;

    for (var r = 1; r < allData.length; r++) {
      var rowNip = allData[r][idxNip] ? allData[r][idxNip].toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : "";
      if (rowNip === nipCleanTarget) {
        targetRow = r + 1; // 1-indexed baris spreadsheet
        break;
      }
    }

    if (targetRow === -1) throw new Error("Pegawai dengan NIP " + nip + " tidak ditemukan di database.");

    // Tulis status baru ke spreadsheet
    sheet.getRange(targetRow, idxStatusPegawai + 1).setValue(statusBaru);

    return {
      success: true,
      message: "Status pegawai berhasil diperbarui menjadi: " + statusBaru
    };
  } catch (err) {
    return {
      success: false,
      message: "Gagal memperbarui status: " + err.message
    };
  }
}