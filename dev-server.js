const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Data dummy lokal untuk simulasi
const dummyPNS = [
  {
    nama: "Ahmad Hidayat, S.T.",
    nip: "199001012020121001",
    pangkat: "Penata Muda Tk. I (III/b)",
    jabatan: "Penata Penanggulangan Bencana Ahli Muda",
    jenis_jabatan: "Pusat",
    jenis_kelamin: "Laki-laki",
    unit_kerja: "Direktorat Kesiapsiagaan",
    tmt_pangkat: "2022-04-01",
    tmt_jabatan: "2022-04-01",
    eselon: "-"
  },
  {
    nama: "Budi Santoso, M.Si.",
    nip: "198503152010011003",
    pangkat: "Penata Tk. I (III/d)",
    jabatan: "Analis Kebencanaan Ahli Madya",
    jenis_jabatan: "Daerah",
    jenis_kelamin: "Laki-laki",
    unit_kerja: "BPBD Prov Jawa Barat",
    tmt_pangkat: "2021-10-01",
    tmt_jabatan: "2020-05-15",
    eselon: "-"
  },
  {
    nama: "Dewi Lestari, S.Psi.",
    nip: "199207202019032005",
    pangkat: "Penata Muda (III/a)",
    jabatan: "Penata Penanggulangan Bencana Ahli Pertama",
    jenis_jabatan: "Pusat",
    jenis_kelamin: "Perempuan",
    unit_kerja: "Direktorat Mitigasi Bencana",
    tmt_pangkat: "2023-04-01",
    tmt_jabatan: "2023-04-01",
    eselon: "-"
  }
];

const dummyPPPK = [
  {
    nama: "Siti Rahma, S.Kom.",
    nip: "199505052023212002",
    pangkat: "Golongan X",
    jabatan: "Pranata Komputer Ahli Pertama",
    jenis_jabatan: "Daerah",
    jenis_kelamin: "Perempuan",
    unit_kerja: "BPBD Prov Jawa Barat",
    tmt_pangkat: "2023-01-01",
    tmt_jabatan: "2023-01-01",
    eselon: "-"
  },
  {
    nama: "Rian Pratama, S.Tr.Kom.",
    nip: "199708122024211004",
    pangkat: "Golongan IX",
    jabatan: "Analis Kebencanaan Ahli Pertama",
    jenis_jabatan: "Pusat",
    jenis_kelamin: "Laki-laki",
    unit_kerja: "Pusdatin BNPB",
    tmt_pangkat: "2024-03-01",
    tmt_jabatan: "2024-03-01",
    eselon: "-"
  }
];

function buildHtml() {
  const dir = __dirname;
  const index = fs.readFileSync(path.join(dir, 'Index.html'), 'utf8');
  const style = fs.readFileSync(path.join(dir, 'Style.html'), 'utf8');
  const script = fs.readFileSync(path.join(dir, 'Script.html'), 'utf8');
  const formEdit = fs.readFileSync(path.join(dir, 'FormEdit.html'), 'utf8');

  // Menggunakan fungsi replacer agar karakter $ di dalam Script.html tidak dirusak oleh regex engine
  let output = index
    .replace(/<\?!=\s*include\(['"]Style['"]\);\s*\?>/g, () => style)
    .replace(/<\?!=\s*include\(['"]FormEdit['"]\);\s*\?>/g, () => formEdit)
    .replace(/<\?!=\s*include\(['"]Script['"]\);\s*\?>/g, () => script);

  // Suntikkan Mock google.script.run untuk lingkungan Browser Lokal
  const mockGasScript = `
  <script>
    (function() {
      const dummyPNS = ${JSON.stringify(dummyPNS)};
      const dummyPPPK = ${JSON.stringify(dummyPPPK)};

      function createMockRunner(successHandler, failureHandler) {
        let onSuccess = successHandler || function() {};
        let onFailure = failureHandler || function(err) { console.error("Mock GAS Error:", err); };

        const handler = {
          get(target, prop) {
            if (prop === 'withSuccessHandler') {
              return function(fn) { return createMockRunner(fn, onFailure); };
            }
            if (prop === 'withFailureHandler') {
              return function(fn) { return createMockRunner(onSuccess, fn); };
            }
            
            // Tangani semua fungsi backend yang dipanggil frontend
            return function(...args) {
              if (prop === 'getDashboardData') {
                setTimeout(() => onSuccess({ pns: dummyPNS.length, pppk: dummyPPPK.length }), 150);
              } else if (prop === 'getFormattedData') {
                const type = args[0];
                setTimeout(() => {
                  const data = (type === 'PPPK') ? dummyPPPK : dummyPNS;
                  onSuccess(data);
                }, 150);
              } else if (prop === 'userHeartbeat') {
                setTimeout(() => onSuccess(1), 50);
              } else if (prop === 'getRekapKebutuhan') {
                setTimeout(() => {
                  onSuccess([
                    { instansi: "BNPB PUSAT", isParent: true, b1: 10, i1: 8, b2: 15, i2: 12, b3: 5, i3: 4, bt: 30, it: 24, s1: -2, s2: -3, s3: -1, st: -6 },
                    { instansi: "Pusat Pembinaan JF", isSubUnit: true, b1: 5, i1: 4, b2: 8, i2: 7, b3: 2, i3: 2, bt: 15, it: 13, s1: -1, s2: -1, s3: 0, st: -2 },
                    { instansi: "BPBD Jawa Barat", isSubUnit: false, b1: 8, i1: 6, b2: 10, i2: 9, b3: 3, i3: 2, bt: 21, it: 17, s1: -2, s2: -1, s3: -1, st: -4 }
                  ]);
                }, 150);
              } else if (prop === 'ambilDataKombinasiGanda') {
                const [nip, hp] = args;
                setTimeout(() => {
                  onSuccess({
                    baris: 2,
                    namaSheet: "Data_PNS",
                    nama: "Ahmad Hidayat, S.T.",
                    nip: nip || "199001012020121001",
                    asalInstansi: "BNPB",
                    pangkat: "Penata Muda Tk. I (III/b)",
                    tmtPangkat: "2022-04-01",
                    jabatan: "Penata Penanggulangan Bencana Ahli Muda",
                    tmtJabatan: "2022-04-01",
                    wilayahKerja: "Pusat",
                    kabupatenKota: "Jakarta Pusat",
                    unitKerja: "Direktorat Kesiapsiagaan",
                    bidangKerja: "Kesiapsiagaan",
                    tanggalLahir: "1990-01-01",
                    pendidikanTerakhir: "S1",
                    programStudi: "Teknik Sipil",
                    noHp: hp || "081234567890",
                    email: "ahmad@bnpb.go.id",
                    diklat: "Sudah",
                    pakTerakhir: "150",
                    linkSkPengangkatan: "",
                    linkSkPangkat: "",
                    linkSkJabatan: "",
                    linkPak: "",
                    linkIjazah: "",
                    linkSertifikat: ""
                  });
                }, 200);
              } else if (prop === 'updateDataPegawaiMassal') {
                setTimeout(() => onSuccess("SUKSES"), 200);
              } else if (prop === 'unggahFileMultiKomponen') {
                setTimeout(() => onSuccess("https://drive.google.com/mock-file-url"), 300);
              } else if (prop === 'ambilKontenHtml') {
                setTimeout(() => onSuccess("<div>Form content</div>"), 100);
              } else {
                console.warn("[Mock GAS] Unhandled method:", prop);
                setTimeout(() => onSuccess(null), 100);
              }
            };
          }
        };

        return new Proxy({}, handler);
      }

      window.google = window.google || {};
      window.google.script = {
        run: createMockRunner()
      };
      console.log("⚡ [Local Dev] Mock google.script.run aktif!");
    })();
  </script>
  `;

  output = output.replace('</head>', () => mockGasScript + '\n</head>');
  return output;
}

const server = http.createServer((req, res) => {
  try {
    const html = buildHtml();
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Error saat memuat halaman: ' + err.message);
  }
});

// Tutup proses server lama jika masih berjalan di port 3000
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} sedang dipakai. Mohon hentikan server lama atau gunakan port lain.\n`);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 ===============================================`);
  console.log(`✨ Local Live Preview aktif!`);
  console.log(`🌐 Buka di browser: http://localhost:${PORT}`);
  console.log(`=================================================\n`);
});
