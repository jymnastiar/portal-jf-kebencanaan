// =========================================================================
// FILE 1: Kode.gs (RUANG MESIN SERVER / BACKEND)
// =========================================================================

function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Portal Data Jabatan Fungsional Kebencanaan")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include(namaFile) {
  try {
    return HtmlService.createHtmlOutputFromFile(namaFile).getContent();
  } catch (err) {
    return "";
  }
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
  return { pns: countValidRows("Data_PNS"), pppk: countValidRows("Data_PPPK") };
}

function getFormattedDataFromSheet(sheet) {
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 2) return [];

  var allData = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  var headers = allData[0].map(function (h) {
    return h.toString().toUpperCase().trim();
  });

  var idxNama = headers.indexOf("NAMA");
  var idxNip = headers.findIndex(
    (h) => h === "NIP" || h === "NI PPPK" || h === "NRP" || h === "NIP / NRP",
  );
  var idxJabatan = headers.indexOf("JABATAN");
  var idxStatus = headers.indexOf("STATUS");
  var idxGender = headers.findIndex(
    (h) =>
      h.includes("JENIS KELAMIN") ||
      h.includes("GENDER") ||
      h === "J/K" ||
      h === "L/P",
  );
  var idxUnit = headers.findIndex((h) => h.includes("UNIT"));
  var idxPangkat = headers.findIndex(
    (h) =>
      h.includes("PANGKAT") || h.includes("GOLONGAN") || h.includes("GRADE"),
  );
  var idxTmtPangkat = headers.findIndex(
    (h) => h.includes("TMT PANGKAT") || h.includes("TMT. PANGKAT"),
  );
  var idxTmtJabatan = headers.findIndex(
    (h) => h.includes("TMT JABATAN") || h.includes("TMT. JABATAN"),
  );
  var idxEselonStatus = headers.indexOf("ESELON");

  var cleanData = [];

  for (var r = 1; r < allData.length; r++) {
    var row = allData[r];
    if (!row[idxNama] || row[idxNama] === "") continue;

    cleanData.push({
      nama: idxNama > -1 ? row[idxNama] : "-",
      nip: idxNip > -1 ? row[idxNip] : "-",
      pangkat: idxPangkat > -1 ? row[idxPangkat] : "-",
      jabatan: idxJabatan > -1 ? row[idxJabatan] : "-",
      jenis_jabatan: idxStatus > -1 ? row[idxStatus] : "-",
      jenis_kelamin: idxGender > -1 ? row[idxGender] : "-",
      unit_kerja: idxUnit > -1 ? row[idxUnit] : "-",
      tmt_pangkat: idxTmtPangkat > -1 ? row[idxTmtPangkat] : "-",
      tmt_jabatan: idxTmtJabatan > -1 ? row[idxTmtJabatan] : "-",
      eselon: idxEselonStatus > -1 ? row[idxEselonStatus] : "-",
    });
  }
  return cleanData;
}

function getFormattedData(type) {
  if (!type) type = "PNS";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = type === "PNS" ? "Data_PNS" : "Data_PPPK";
  var sheet = ss.getSheetByName(sheetName);
  return getFormattedDataFromSheet(sheet);
}

// FUNGSI SUPER CEPAT (ALL-IN-ONE): Mengambil seluruh data awal hanya dalam 1 roundtrip network
function getInitialAppData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetPNS = ss.getSheetByName("Data_PNS");
  var sheetPPPK = ss.getSheetByName("Data_PPPK");

  var pnsData = getFormattedDataFromSheet(sheetPNS);
  var pppkData = getFormattedDataFromSheet(sheetPPPK);
  var formasiData = getRekapKebutuhanData(ss, false);

  return {
    pns: pnsData,
    pppk: pppkData,
    formasi: formasiData,
    stats: {
      pns: pnsData.length,
      pppk: pppkData.length,
    },
  };
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
    var activeCount = 0;
    var cleanUsers = {};
    for (var id in users) {
      if (now - users[id] < 300000) {
        cleanUsers[id] = users[id];
        activeCount++;
      }
    }
    cache.put(cacheKey, JSON.stringify(cleanUsers), 600);
    return activeCount;
  } catch (e) {
    return 1;
  } finally {
    lock.releaseLock();
  }
}

function ambilDataKombinasiGanda(nipCari, inputSandi) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const daftarSheet = ["Data_PNS", "Data_PPPK"];
  if (!nipCari || !inputSandi) return null;

  let nipTarget = nipCari.toString().replace(/[^0-9]/g, "");
  let sandiTarget = inputSandi.toString().trim();
  let hpTarget = sandiTarget.replace(/[\s\-+]/g, "").toLowerCase();

  // Tolak jika NIP kurang dari 8 digit atau sandi kurang dari 6 karakter
  if (nipTarget.length < 8 || sandiTarget.length < 6) return null;

  var standarisasiHp = function (teksHp) {
    if (teksHp.startsWith("628")) return teksHp.substring(2);
    if (teksHp.startsWith("08")) return teksHp.substring(1);
    return teksHp;
  };
  let hpTargetStandar = standarisasiHp(hpTarget);

  for (let s = 0; s < daftarSheet.length; s++) {
    let namaSheet = daftarSheet[s];
    let sheet = ss.getSheetByName(namaSheet);
    if (!sheet) continue;
    let data = sheet.getDataRange().getDisplayValues();
    if (data.length < 2) continue;

    let headers = data[0].map((h) => h.toString().toUpperCase().trim());

    let hNama = headers.indexOf("NAMA");
    let hNip = headers.findIndex(
      (h) => h === "NIP" || h === "NI PPPK" || h === "NRP",
    );
    let hHp = headers.indexOf("NO HP");
    let hSandi = headers.findIndex(
      (h) => h === "SANDI" || h === "KATA SANDI" || h === "PASSWORD",
    );
    if (hNip === -1 || hHp === -1) continue;

    let hAsal = headers.indexOf("ASAL INSTANSI");
    let hPangkat = headers.findIndex(
      (h) => h.includes("PANGKAT") || h.includes("GOLONGAN"),
    );
    let hTmtPangkat = headers.findIndex((h) => h.includes("TMT PANGKAT"));
    let hJabatan = headers.indexOf("JABATAN");
    let hTmtJabatan = headers.findIndex((h) => h.includes("TMT JABATAN"));
    let hWilayah = headers.indexOf("STATUS");
    let hKabKota = headers.indexOf("KABUPATEN/KOTA");
    let hUnit = headers.findIndex((h) => h.includes("UNIT"));
    let hBidang = headers.indexOf("BIDANG");
    let hTglLahir = headers.indexOf("TANGGAL LAHIR");
    let hPendidikan = headers.indexOf("PENDIDIKAN TERAKHIR");
    let hProdi = headers.indexOf("PROGRAM STUDI");
    let hEmail = headers.findIndex((h) => h.includes("EMAIL"));
    let hDiklat = headers.findIndex(
      (h) =>
        h.includes("DIKLAT PB") &&
        !h.includes("UNGGAH") &&
        !h.includes("SERTIFIKAT"),
    );
    let hPak = headers.findIndex(
      (h) => h.includes("PAK TERAKHIR") && !h.includes("UNGGAH"),
    );

    let hSkCpns = headers.findIndex((h) => h.includes("SK CPNS"));
    let hSkPengangkatan = headers.findIndex((h) =>
      h.includes("SK PENGANGKATAN"),
    );
    let hSkPangkat = headers.findIndex(
      (h) => h.includes("SK PANGKAT") || h.includes("SK GOLONGAN"),
    );
    let hSkJabatan = headers.findIndex((h) => h.includes("SK JABATAN"));
    let hUnggahPak = headers.findIndex(
      (h) =>
        h.includes("UNGGAH PAK") ||
        h.includes("UNGGAH PENILAIAN") ||
        (h.includes("PAK TERAKHIR") && h.includes("UNGGAH")),
    );
    let hIjazah = headers.findIndex((h) => h.includes("IJAZAH"));
    let hSertifikat = headers.findIndex((h) => h.includes("SERTIFIKAT DIKLAT"));
    let hSertifikatKompetensi = headers.findIndex(
      (h) => h.includes("SERTIFIKAT KOMPETENSI") || h.includes("KOMPETENSI JF"),
    );

    for (let i = 1; i < data.length; i++) {
      let barisData = data[i];
      if (!barisData) continue;

      let nipDiSheet = barisData[hNip]
        ? barisData[hNip].toString().replace(/[^0-9]/g, "")
        : "";
      if (nipDiSheet === "" || nipDiSheet !== nipTarget) continue;

      let hpDiSheet = barisData[hHp]
        ? barisData[hHp]
            .toString()
            .replace(/[\s\-+]/g, "")
            .trim()
            .toLowerCase()
        : "";
      let sandiDiSheet =
        hSandi > -1 && barisData[hSandi]
          ? barisData[hSandi].toString().trim()
          : "";

      let isCocok = false;
      let wajibGantiSandi = false;

      // LOGIKA CEK LOGIN PERTAMA VS LOGIN BERIKUTNYA
      if (sandiDiSheet !== "") {
        // Jika sudah pernah mengganti sandi, WAJIB cocok dengan Sandi Baru
        if (sandiDiSheet === sandiTarget) {
          isCocok = true;
          wajibGantiSandi = false;
        }
      } else {
        // Jika belum pernah mengganti sandi (login pertama), cocokkan dengan No HP awal
        let hpSheetStandar = standarisasiHp(hpDiSheet);
        if (
          hpSheetStandar !== "" &&
          hpTargetStandar.length >= 7 &&
          hpSheetStandar === hpTargetStandar
        ) {
          isCocok = true;
          wajibGantiSandi = true; // Tandai bahwa user wajib membuat sandi baru!
        }
      }

      if (isCocok) {
        var formatTglInput = function (val) {
          if (
            !val ||
            val.toString().trim() === "" ||
            val.toString().trim() === "-"
          )
            return "";
          let strVal = val.toString().trim();
          if (strVal.includes("/")) {
            let parts = strVal.split("/");
            if (parts.length === 3)
              return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
          if (strVal.includes("-")) {
            let parts = strVal.split("-");
            if (parts.length === 3)
              return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
          }
          return strVal;
        };

        const getV = (idx) =>
          idx > -1 && barisData[idx] ? barisData[idx] : "";

        return {
          baris: i + 1,
          namaSheet: namaSheet,
          wajibGantiSandi: wajibGantiSandi, // Penanda apakah harus ganti sandi dulu
          nama: getV(hNama),
          nip: getV(hNip),
          asalInstansi: getV(hAsal),
          pangkat: getV(hPangkat),
          tmtPangkat: formatTglInput(getV(hTmtPangkat)),
          jabatan: getV(hJabatan),
          tmtJabatan: formatTglInput(getV(hTmtJabatan)),
          wilayahKerja: getV(hWilayah),
          kabupatenKota: getV(hKabKota),
          unitKerja: getV(hUnit),
          bidangKerja: getV(hBidang),
          tanggalLahir: formatTglInput(getV(hTglLahir)),
          pendidikanTerakhir: getV(hPendidikan),
          programStudi: getV(hProdi),
          noHp: getV(hHp),
          email: getV(hEmail),
          diklat: getV(hDiklat),
          pakTerakhir: getV(hPak),
          linkSkCpns: getV(hSkCpns),
          linkSkPengangkatan: getV(hSkPengangkatan),
          linkSkPangkat: getV(hSkPangkat),
          linkSkJabatan: getV(hSkJabatan),
          linkPak: getV(hUnggahPak),
          linkIjazah: getV(hIjazah),
          linkSertifikat: getV(hSertifikat),
          linkSertifikatKompetensi: getV(hSertifikatKompetensi),
        };
      }
    }
  }
  return null;
}

// =========================================================================
// FUNGSI BARU: MENYIMPAN KATA SANDI BARU SAAT PERTAMA KALI LOGIN
// =========================================================================
function simpanSandiBaruPegawai(nipInput, sandiLamaInput, sandiBaruInput) {
  try {
    if (!sandiBaruInput || sandiBaruInput.toString().trim().length < 6) {
      return {
        sukses: false,
        pesan: "Kata sandi baru minimal harus 6 karakter!",
      };
    }

    // Pastikan kredensial lama memang valid
    const dataPegawai = ambilDataKombinasiGanda(nipInput, sandiLamaInput);
    if (!dataPegawai) {
      return {
        sukses: false,
        pesan: "Verifikasi gagal! NIP atau sandi awal tidak cocok.",
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(dataPegawai.namaSheet);
    let lastCol = sheet.getLastColumn();
    let headers = sheet
      .getRange(1, 1, 1, lastCol)
      .getValues()[0]
      .map((h) => h.toString().toUpperCase().trim());

    // Cari kolom SANDI. Jika belum ada di Spreadsheet, buatkan kolom baru otomatis di paling kanan!
    let idxSandi = headers.findIndex(
      (h) => h === "SANDI" || h === "KATA SANDI" || h === "PASSWORD",
    );
    if (idxSandi === -1) {
      idxSandi = lastCol;
      sheet.getRange(1, idxSandi + 1).setValue("SANDI");
    }

    // Simpan sandi baru ke baris pegawai tersebut (Format teks agar angka 0 di depan tidak hilang)
    sheet
      .getRange(dataPegawai.baris, idxSandi + 1)
      .setNumberFormat("@")
      .setValue(sandiBaruInput.toString().trim());
    SpreadsheetApp.flush();

    return { sukses: true, pesan: "Kata sandi baru berhasil diaktifkan!" };
  } catch (e) {
    return { sukses: false, pesan: "Gagal menyimpan sandi: " + e.toString() };
  }
}

// =========================================================================
// PENGATUR HIERARKI FOLDER: JF Kebencanaan > PNS/PPPK > Sub-Folder Dokumen
// =========================================================================
function ambilFolderSesuaiStatusDanDokumen(namaSheet, jenisDokumen) {
  var idFolderJFKebencanaan = "1ZfjBUYrUlYX-uc0_00X_f7Du6XmHjCfg";
  var folderUtama = DriveApp.getFolderById(idFolderJFKebencanaan);

  // 1. Tentukan folder induk berdasarkan status PNS atau PPPK
  var isPPPK = namaSheet && namaSheet.toString().toUpperCase().includes("PPPK");
  var namaFolderStatus = isPPPK
    ? "Data JF Kebencanaan - PPPK (File responses)"
    : "Data JF Kebencanaan - PNS (File responses)";

  var folderStatusIterator = folderUtama.getFoldersByName(namaFolderStatus);
  var folderStatus = folderStatusIterator.hasNext()
    ? folderStatusIterator.next()
    : folderUtama.createFolder(namaFolderStatus);

  // 2. Petakan kata kunci pencarian & nama standar sub-folder sesuai G.Form (8 PNS & 3 PPPK)
  var petaSubFolder = {
    SK_CPNS: {
      kataKunci: "SK CPNS",
      namaDefault: "Unggah SK CPNS (File responses)",
    },
    SK_Pengangkatan_JF: {
      kataKunci: "SK PENGANGKATAN",
      namaDefault: "Unggah SK Pengangkatan JF (File responses)",
    },
    SK_Pengangkatan_PPPK: {
      kataKunci: "SK PENGANGKATAN",
      namaDefault: "Unggah SK Pengangkatan PPPK (File responses)",
    },
    SK_Pengangkatan: {
      kataKunci: "SK PENGANGKATAN",
      namaDefault: isPPPK
        ? "Unggah SK Pengangkatan PPPK (File responses)"
        : "Unggah SK Pengangkatan JF (File responses)",
    },
    SK_Pangkat: {
      kataKunci: "SK PANGKAT",
      namaDefault: "Unggah SK Pangkat Terakhir (File responses)",
    },
    SK_Jabatan: {
      kataKunci: "SK JABATAN",
      namaDefault: "Unggah SK Jabatan Terakhir (File responses)",
    },
    PAK: {
      kataKunci: "PAK TERAKHIR",
      namaDefault: "Unggah PAK Terakhir (File responses)",
    },
    Ijazah: {
      kataKunci: "IJAZAH",
      namaDefault: "Unggah Ijazah Pendidikan Terakhir (File responses)",
    },
    Sertifikat_Diklat_PB: {
      kataKunci: "SERTIFIKAT DIKLAT",
      namaDefault: "Unggah Sertifikat Diklat PB (File responses)",
    },
    Sertifikat: {
      kataKunci: "SERTIFIKAT DIKLAT",
      namaDefault: "Unggah Sertifikat Diklat PB (File responses)",
    },
    Sertifikat_Kompetensi_JF: {
      kataKunci: "SERTIFIKAT KOMPETENSI",
      namaDefault: "Unggah Sertifikat Kompetensi JF (File responses)",
    },
  };

  var target = petaSubFolder[jenisDokumen] || {
    kataKunci: jenisDokumen.toUpperCase(),
    namaDefault: jenisDokumen,
  };

  var subFolders = folderStatus.getFolders();
  while (subFolders.hasNext()) {
    var sf = subFolders.next();
    if (sf.getName().toUpperCase().includes(target.kataKunci)) {
      return sf;
    }
  }

  return folderStatus.createFolder(target.namaDefault);
}

// =========================================================================
// FUNGSI 1: UNGGAH DARI PORTAL (VALIDASI PDF MAKS 1 MB + MASUK FOLDER + UBAH NAMA)
// =========================================================================
function unggahFileMultiKomponen(
  fileData,
  nipPegawai,
  jenisDokumen,
  namaPegawai,
  namaSheet,
) {
  try {
    if (!nipPegawai || nipPegawai.toString().trim() === "")
      throw new Error("NIP kosong.");

    // Validasi wajib PDF
    if (
      !fileData.type.includes("pdf") &&
      !fileData.name.toLowerCase().endsWith(".pdf")
    ) {
      throw new Error("Format file wajib PDF.");
    }

    const bytes = Utilities.base64Decode(fileData.data);

    // Validasi maksimal 1 MB (1.048.576 bytes)
    if (bytes.length > 1048576) {
      throw new Error("Ukuran file melebihi batas maksimal 1 MB.");
    }

    const folderTujuan = ambilFolderSesuaiStatusDanDokumen(
      namaSheet,
      jenisDokumen,
    );

    let namaBersih = (namaPegawai || "Pegawai")
      .toString()
      .replace(/[\\/:*?"<>|]/g, "")
      .trim();
    let nipBersih = nipPegawai.toString().replace(/\s+/g, "").trim();
    let namaFileBaru = `${jenisDokumen}_${namaBersih}_${nipBersih}.pdf`;

    const blob = Utilities.newBlob(bytes, "application/pdf", namaFileBaru);
    const file = folderTujuan.createFile(blob);
    return file.getUrl();
  } catch (error) {
    throw new Error("Gagal simpan ke Google Drive: " + error.toString());
  }
}

// =========================================================================
// FUNGSI 2: UBAH NAMA FILE DARI GOOGLE FORM & PASTIKAN DI SUB-FOLDER TEPAT
// =========================================================================
function prosesFileDariForm(
  urlMentah,
  jenisDokumen,
  namaPegawai,
  nipPegawai,
  namaSheetTujuan,
) {
  if (!urlMentah || !urlMentah.toString().includes("drive.google.com"))
    return urlMentah;
  try {
    var folderTujuan = ambilFolderSesuaiStatusDanDokumen(
      namaSheetTujuan,
      jenisDokumen,
    );
    var namaBersih = (namaPegawai || "Pegawai")
      .toString()
      .replace(/[\\/:*?"<>|]/g, "")
      .trim();
    var nipBersih = (nipPegawai || "").toString().replace(/\s+/g, "").trim();

    var daftarUrl = urlMentah
      .toString()
      .split(",")
      .map((u) => u.trim());
    var urlBaruList = [];

    daftarUrl.forEach(function (url) {
      var match = url.match(/[-\w]{25,}/);
      if (match && match[0]) {
        var fileId = match[0];
        var file = DriveApp.getFileById(fileId);
        var namaAsli = file.getName();
        var ext = namaAsli.includes(".")
          ? namaAsli.substring(namaAsli.lastIndexOf("."))
          : ".pdf";

        var namaBaru = `${jenisDokumen}_${namaBersih}_${nipBersih}${ext}`;
        file.setName(namaBaru);
        file.moveTo(folderTujuan);

        urlBaruList.push(file.getUrl());
      } else {
        urlBaruList.push(url);
      }
    });

    return urlBaruList.join(", ");
  } catch (err) {
    console.error(
      "Gagal memproses file Form (" + jenisDokumen + "): " + err.toString(),
    );
    return urlMentah;
  }
}

function updateDataPegawaiMassal(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(payload.namaSheet);
    if (!sheet) return "Gagal: Lembar data tidak ditemukan.";

    let r = parseInt(payload.nomorBaris);
    let lastCol = sheet.getLastColumn();
    let headers = sheet
      .getRange(1, 1, 1, lastCol)
      .getValues()[0]
      .map((h) => h.toString().toUpperCase().trim());

    const setV = (headerName, value, isLink = false) => {
      let idx = headers.indexOf(headerName);
      if (idx === -1 && headerName === "NIP")
        idx = headers.findIndex((h) => h === "NI PPPK" || h === "NRP");
      if (idx === -1 && headerName === "PANGKAT")
        idx = headers.findIndex(
          (h) => h.includes("PANGKAT") || h.includes("GOLONGAN"),
        );
      if (idx === -1 && headerName === "STATUS")
        idx = headers.indexOf("STATUS");
      if (idx === -1 && headerName === "UNIT KERJA")
        idx = headers.findIndex((h) => h.includes("UNIT"));
      if (idx === -1 && headerName === "EMAIL")
        idx = headers.findIndex((h) => h.includes("EMAIL"));
      if (idx === -1 && headerName === "DIKLAT PB")
        idx = headers.findIndex(
          (h) =>
            h.includes("DIKLAT PB") &&
            !h.includes("UNGGAH") &&
            !h.includes("SERTIFIKAT"),
        );
      if (idx === -1 && headerName === "PAK TERAKHIR")
        idx = headers.findIndex(
          (h) => h.includes("PAK TERAKHIR") && !h.includes("UNGGAH"),
        );

      if (isLink) {
        if (headerName === "SK_CPNS")
          idx = headers.findIndex((h) => h.includes("SK CPNS"));
        if (headerName === "SK_PENGANGKATAN")
          idx = headers.findIndex((h) => h.includes("SK PENGANGKATAN"));
        if (headerName === "SK_PANGKAT")
          idx = headers.findIndex(
            (h) => h.includes("SK PANGKAT") || h.includes("SK GOLONGAN"),
          );
        if (headerName === "SK_JABATAN")
          idx = headers.findIndex((h) => h.includes("SK JABATAN"));
        if (headerName === "UNGGAH PAK")
          idx = headers.findIndex(
            (h) =>
              h.includes("UNGGAH PAK") ||
              h.includes("UNGGAH PENILAIAN") ||
              (h.includes("PAK TERAKHIR") && h.includes("UNGGAH")),
          );
        if (headerName === "IJAZAH")
          idx = headers.findIndex((h) => h.includes("IJAZAH"));
        if (headerName === "SERTIFIKAT")
          idx = headers.findIndex((h) => h.includes("SERTIFIKAT DIKLAT"));
        if (headerName === "SERTIFIKAT_KOMPETENSI")
          idx = headers.findIndex(
            (h) =>
              h.includes("SERTIFIKAT KOMPETENSI") ||
              h.includes("KOMPETENSI JF"),
          );
      }
      if (idx > -1 && value) {
        sheet.getRange(r, idx + 1).setValue(value);
      }
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

    if (payload.linkSkCpns) setV("SK_CPNS", payload.linkSkCpns, true);
    if (payload.linkSkPengangkatan)
      setV("SK_PENGANGKATAN", payload.linkSkPengangkatan, true);
    if (payload.linkSkPangkat) setV("SK_PANGKAT", payload.linkSkPangkat, true);
    if (payload.linkSkJabatan) setV("SK_JABATAN", payload.linkSkJabatan, true);
    if (payload.linkPak) setV("UNGGAH PAK", payload.linkPak, true);
    if (payload.linkIjazah) setV("IJAZAH", payload.linkIjazah, true);
    if (payload.linkSertifikat)
      setV("SERTIFIKAT", payload.linkSertifikat, true);
    if (payload.linkSertifikatKompetensi)
      setV("SERTIFIKAT_KOMPETENSI", payload.linkSertifikatKompetensi, true);

    SpreadsheetApp.flush();
    return "SUKSES";
  } catch (error) {
    return "Gagal memperbarui baris: " + error.toString();
  }
}

function ambilKontenHtml(namaFile) {
  try {
    if (!namaFile || namaFile === undefined || namaFile === "undefined")
      namaFile = "Index";
    return HtmlService.createTemplateFromFile(namaFile).evaluate().getContent();
  } catch (err) {
    throw new Error(
      "Gagal memuat file '" + namaFile + "'. Detail: " + err.toString(),
    );
  }
}

// =========================================================================
// FUNGSI 10: ROBOT PEMINDAH OTOMATIS (DENGAN KARANTINA NIP GANDA & RENAME FILE)
// =========================================================================
function pindahkanDataOtomatis(e) {
  if (!e) return;
  var sheetSumber = e.range.getSheet();
  var namaSheetSumber = sheetSumber.getName();

  var namaSheetTujuan = "";
  if (
    namaSheetSumber === "PNS" ||
    namaSheetSumber.includes("Form Responses PNS")
  )
    namaSheetTujuan = "Data_PNS";
  else if (
    namaSheetSumber === "PPPK" ||
    namaSheetSumber.includes("Form Responses PPPK")
  )
    namaSheetTujuan = "Data_PPPK";
  else return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetTujuan = ss.getSheetByName(namaSheetTujuan);
  if (!sheetTujuan) return;

  var headersSumber = sheetSumber
    .getRange(1, 1, 1, sheetSumber.getLastColumn())
    .getValues()[0]
    .map((h) => h.toString().toUpperCase().replace(/:/g, "").trim());
  var rowData = e.values;

  var idxWilayah = headersSumber.findIndex(
    (h) => h === "WILAYAH KERJA" || h === "STATUS",
  );
  var wilayahKerja =
    idxWilayah > -1 && rowData[idxWilayah]
      ? rowData[idxWilayah].toString().trim().toUpperCase()
      : "";

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

  var idxAsalInstansi = headersSumber.indexOf("ASAL INSTANSI");
  var asalInstansi =
    idxAsalInstansi > -1 && rowData[idxAsalInstansi]
      ? rowData[idxAsalInstansi].toString().trim().toUpperCase()
      : "";

  var idxKedeputian = headersSumber.indexOf("KEDEPUTIAN");
  var idxUnit = headersSumber.findIndex(
    (h) => h === "UNIT KERJA" || h === "UNIT",
  );
  var kedeputianStr =
    idxKedeputian > -1 && rowData[idxKedeputian]
      ? rowData[idxKedeputian].trim()
      : "";
  var unitStr = idxUnit > -1 && rowData[idxUnit] ? rowData[idxUnit].trim() : "";

  var unitKerjaFix = "-";
  if (asalInstansi.includes("BPBD")) {
    if (kabKotaFix !== "-" && kabKotaFix !== "BNPB PUSAT")
      unitKerjaFix = "BPBD " + kabKotaFix;
    else if (
      wilayahKerja !== "" &&
      wilayahKerja !== "PUSAT" &&
      wilayahKerja !== "BNPB PUSAT"
    )
      unitKerjaFix = "BPBD " + wilayahKerja;
    else unitKerjaFix = asalInstansi;
  } else {
    if (kedeputianStr && unitStr)
      unitKerjaFix = kedeputianStr + " > " + unitStr;
    else if (kedeputianStr) unitKerjaFix = kedeputianStr;
    else if (unitStr) unitKerjaFix = unitStr;
  }

  var idxNamaSumber = headersSumber.indexOf("NAMA");
  var idxNipSumber = headersSumber.findIndex(
    (h) => h === "NIP" || h === "NI PPPK" || h === "NRP",
  );
  var namaPengirim =
    idxNamaSumber > -1 && rowData[idxNamaSumber]
      ? rowData[idxNamaSumber].toString().trim()
      : "Tanpa_Nama";
  var nipPengirim =
    idxNipSumber > -1 && rowData[idxNipSumber]
      ? rowData[idxNipSumber].toString().trim()
      : "Tanpa_NIP";

  var headersTujuan = sheetTujuan
    .getRange(1, 1, 1, sheetTujuan.getLastColumn())
    .getValues()[0]
    .map((h) => h.toString().toUpperCase().trim());
  var newRow = new Array(headersTujuan.length).fill("");

  for (var t = 1; t < headersTujuan.length; t++) {
    var headerT = headersTujuan[t];

    if (headerT === "KABUPATEN/KOTA" || headerT === "STATUS") {
      newRow[t] = kabKotaFix;
      continue;
    }
    if (headerT === "UNIT KERJA" || headerT === "UNIT") {
      newRow[t] = unitKerjaFix;
      continue;
    }

    var idxS = headersSumber.indexOf(headerT);
    if (idxS === -1 && headerT === "NIP")
      idxS = headersSumber.findIndex(
        (h) => h === "NIP" || h === "NI PPPK" || h === "NRP",
      );
    if (idxS === -1 && (headerT === "GENDER" || headerT === "JENIS KELAMIN"))
      idxS = headersSumber.findIndex(
        (h) =>
          h.includes("JENIS KELAMIN") ||
          h.includes("GENDER") ||
          h === "J/K" ||
          h === "L/P",
      );

    var jenisDok = "";
    if (headerT.includes("SK CPNS")) {
      idxS = headersSumber.findIndex((h) => h.includes("SK CPNS"));
      jenisDok = "SK_CPNS";
    } else if (headerT.includes("SK PENGANGKATAN")) {
      idxS = headersSumber.findIndex((h) => h.includes("SK PENGANGKATAN"));
      jenisDok =
        namaSheetTujuan === "Data_PPPK"
          ? "SK_Pengangkatan_PPPK"
          : "SK_Pengangkatan_JF";
    } else if (
      headerT.includes("SK PANGKAT") ||
      headerT.includes("SK GOLONGAN")
    ) {
      idxS = headersSumber.findIndex(
        (h) => h.includes("SK PANGKAT") || h.includes("SK GOLONGAN"),
      );
      jenisDok = "SK_Pangkat";
    } else if (headerT.includes("SK JABATAN")) {
      idxS = headersSumber.findIndex((h) => h.includes("SK JABATAN"));
      jenisDok = "SK_Jabatan";
    } else if (headerT.includes("UNGGAH PAK")) {
      idxS = headersSumber.findIndex(
        (h) => h.includes("UNGGAH PAK") || h.includes("UNGGAH PENILAIAN"),
      );
      jenisDok = "PAK";
    } else if (headerT.includes("IJAZAH")) {
      idxS = headersSumber.findIndex((h) => h.includes("IJAZAH"));
      jenisDok = "Ijazah";
    } else if (headerT.includes("SERTIFIKAT DIKLAT")) {
      idxS = headersSumber.findIndex((h) => h.includes("SERTIFIKAT DIKLAT"));
      jenisDok = "Sertifikat_Diklat_PB";
    } else if (
      headerT.includes("SERTIFIKAT KOMPETENSI") ||
      headerT.includes("KOMPETENSI JF")
    ) {
      idxS = headersSumber.findIndex(
        (h) =>
          h.includes("SERTIFIKAT KOMPETENSI") || h.includes("KOMPETENSI JF"),
      );
      jenisDok = "Sertifikat_Kompetensi_JF";
    }

    if (idxS > -1 && rowData[idxS]) {
      if (headerT === "ASAL INSTANSI") {
        newRow[t] = rowData[idxS].toString().trim().toUpperCase();
      } else if (jenisDok !== "") {
        newRow[t] = prosesFileDariForm(
          rowData[idxS],
          jenisDok,
          namaPengirim,
          nipPengirim,
          namaSheetTujuan,
        );
      } else {
        newRow[t] = rowData[idxS];
      }
    }
  }

  var idxNipTujuan = headersTujuan.findIndex(
    (h) => h === "NIP" || h === "NI PPPK" || h === "NRP",
  );
  var nipBaru =
    idxNipTujuan > -1
      ? newRow[idxNipTujuan].toString().replace(/\s+/g, "").trim()
      : "";
  var isDouble = false;

  if (nipBaru !== "" && nipBaru !== "-") {
    var dataLama = sheetTujuan.getDataRange().getValues();
    for (var r = 1; r < dataLama.length; r++) {
      var nipLama = dataLama[r][idxNipTujuan]
        ? dataLama[r][idxNipTujuan].toString().replace(/\s+/g, "").trim()
        : "";
      if (nipLama === nipBaru) {
        isDouble = true;
        break;
      }
    }
    if (!isDouble) {
      var sheetDoubleCheck = ss.getSheetByName("Data_Double");
      if (sheetDoubleCheck && sheetDoubleCheck.getLastRow() > 1) {
        var dataDouble = sheetDoubleCheck.getDataRange().getValues();
        for (var d = 1; d < dataDouble.length; d++) {
          var nipDouble = dataDouble[d][idxNipTujuan]
            ? dataDouble[d][idxNipTujuan].toString().replace(/\s+/g, "").trim()
            : "";
          if (nipDouble === nipBaru) {
            isDouble = true;
            break;
          }
        }
      }
    }
  }

  if (isDouble) {
    var sheetGanda = ss.getSheetByName("Data_Double");
    if (sheetGanda) sheetGanda.appendRow(newRow);
  } else {
    sheetTujuan.appendRow(newRow);
  }

  SpreadsheetApp.flush();
  PropertiesService.getScriptProperties().setProperty(
    "LAST_DATA_UPDATE",
    new Date().getTime().toString(),
  );
}

// =========================================================================
// FUNGSI 11: REKAP KEBUTUHAN VS KETERISIAN FORMASI JF (+ SINKRON KE EXCEL)
// =========================================================================
function getRekapKebutuhanData(ss, shouldWriteToSheet) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetFormasi = ss.getSheetByName("Formasi_JF");
  var sheetGabungan = ss.getSheetByName("Data_Gabungan");
  if (!sheetFormasi || !sheetGabungan) return [];

  var dataGabungan = sheetGabungan.getDataRange().getValues();
  var headersGab = dataGabungan[0].map((h) =>
    h.toString().toUpperCase().trim(),
  );
  var idxUnit = headersGab.indexOf("UNIT KERJA");
  var idxJabatan = headersGab.indexOf("JABATAN");

  var pegawaiData = [];
  for (var i = 1; i < dataGabungan.length; i++) {
    pegawaiData.push({
      unit: dataGabungan[i][idxUnit]
        ? dataGabungan[i][idxUnit].toString().toUpperCase()
        : "",
      jabatan: dataGabungan[i][idxJabatan]
        ? dataGabungan[i][idxJabatan].toString().toUpperCase()
        : "",
    });
  }

  var dataFormasi = sheetFormasi.getDataRange().getValues();
  var hasilSementara = [];
  var arrayUpdateKeExcel = [];

  for (var r = 3; r < dataFormasi.length; r++) {
    var row = dataFormasi[r];
    var namaInstansi =
      row[2] && row[2].toString().trim() !== ""
        ? row[2].toString().trim()
        : row[1]
          ? row[1].toString().trim()
          : "";

    if (namaInstansi === "" || namaInstansi.toUpperCase() === "NAN") {
      arrayUpdateKeExcel.push(["", "", "", ""]);
      continue;
    }

    var searchStr = namaInstansi.toUpperCase();
    if (
      searchStr.includes("PROVINSI") ||
      searchStr.includes("KABUPATEN") ||
      searchStr.includes("KOTA")
    ) {
      if (!searchStr.startsWith("BPBD")) searchStr = "BPBD " + searchStr;
    } else if (
      searchStr.includes("DEPUTI") ||
      searchStr.includes("PUSAT PEMBINAAN")
    ) {
      if (!searchStr.endsWith("BNPB")) searchStr = searchStr + " BNPB";
    }

    var isiPertama = 0,
      isiMuda = 0,
      isiMadya = 0;
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

    if (butuhTotal === 0 && isiTotal === 0 && searchStr !== "BNPB") {
      arrayUpdateKeExcel.push(["", "", "", ""]);
    } else {
      arrayUpdateKeExcel.push([isiPertama, isiMuda, isiMadya, isiTotal]);
    }

    if (butuhTotal === 0 && isiTotal === 0 && searchStr !== "BNPB") continue;

    hasilSementara.push({
      instansi: namaInstansi,
      b1: butuhPertama,
      i1: isiPertama,
      b2: butuhMuda,
      i2: isiMuda,
      b3: butuhMadya,
      i3: isiMadya,
      bt: butuhTotal,
      it: isiTotal,
    });
  }

  // Hanya tulis ke spreadsheet jika diminta secara eksplisit (mencegah sheet-write lock saat baca data)
  if (shouldWriteToSheet === true && arrayUpdateKeExcel.length > 0) {
    try {
      sheetFormasi
        .getRange(4, 8, arrayUpdateKeExcel.length, 4)
        .setValues(arrayUpdateKeExcel);
    } catch (e) {
      console.warn("Gagal update ke sheet formasi: " + e.message);
    }
  }

  var bnpbInduk = {
    instansi: "BNPB PUSAT",
    isParent: true,
    b1: 0,
    i1: 0,
    b2: 0,
    i2: 0,
    b3: 0,
    i3: 0,
    bt: 0,
    it: 0,
  };
  var anakBNPB = [];
  var dataBPBD = [];

  for (var i = 0; i < hasilSementara.length; i++) {
    var item = hasilSementara[i];
    var nm = item.instansi.toUpperCase();
    if (nm === "BNPB") continue;

    if (
      nm.includes("DEPUTI") ||
      nm.includes("PUSAT PEMBINAAN") ||
      nm.includes("SEKRETARIAT") ||
      nm.includes("INSPEKTORAT")
    ) {
      bnpbInduk.b1 += item.b1;
      bnpbInduk.i1 += item.i1;
      bnpbInduk.b2 += item.b2;
      bnpbInduk.i2 += item.i2;
      bnpbInduk.b3 += item.b3;
      bnpbInduk.i3 += item.i3;
      bnpbInduk.bt += item.bt;
      bnpbInduk.it += item.it;

      item.isSubUnit = true;
      item.s1 = item.i1 - item.b1;
      item.s2 = item.i2 - item.b2;
      item.s3 = item.i3 - item.b3;
      item.st = item.it - item.bt;
      anakBNPB.push(item);
    } else {
      item.isSubUnit = false;
      item.s1 = item.i1 - item.b1;
      item.s2 = item.i2 - item.b2;
      item.s3 = item.i3 - item.b3;
      item.st = item.it - item.bt;
      dataBPBD.push(item);
    }
  }

  bnpbInduk.s1 = bnpbInduk.i1 - bnpbInduk.b1;
  bnpbInduk.s2 = bnpbInduk.i2 - bnpbInduk.b2;
  bnpbInduk.s3 = bnpbInduk.i3 - bnpbInduk.b3;
  bnpbInduk.st = bnpbInduk.it - bnpbInduk.bt;

  return [bnpbInduk].concat(anakBNPB).concat(dataBPBD);
}

function getRekapKebutuhan(shouldWriteToSheet) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return getRekapKebutuhanData(ss, shouldWriteToSheet === true);
}
