--
-- PostgreSQL database dump
--

\restrict HnB1WLhw4Vds77TBOdpv7OnzsjVWl2k6z2tb99Gva1qD1YNvmTwX9eAl2j1fUvj

-- Dumped from database version 18.6 (Homebrew)
-- Dumped by pg_dump version 18.6 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: fn_arsip_permanen(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_arsip_permanen() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Data pada tabel % bersifat permanen dan tidak dapat diubah atau dihapus', TG_TABLE_NAME;
END;
$$;


ALTER FUNCTION public.fn_arsip_permanen() OWNER TO postgres;

--
-- Name: fn_rekam_medis_baru(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_rekam_medis_baru() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_status VARCHAR(12);
BEGIN
  SELECT status INTO v_status FROM janji_temu WHERE id = NEW.janji_temu_id FOR UPDATE;

  IF v_status IS DISTINCT FROM 'Approved' THEN
    RAISE EXCEPTION 'Rekam medis hanya dapat dibuat untuk janji temu berstatus Approved (saat ini: %)', v_status;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_rekam_medis_baru() OWNER TO postgres;

--
-- Name: fn_rekam_medis_setelah_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_rekam_medis_setelah_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE janji_temu
     SET status = 'Selesai', updated_at = NOW()
   WHERE id = NEW.janji_temu_id;

  INSERT INTO resep (rekam_medis_id, status)
  VALUES (NEW.id, 'Menunggu Diproses');

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_rekam_medis_setelah_insert() OWNER TO postgres;

--
-- Name: fn_resep_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_resep_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  item RECORD;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
         (OLD.status = 'Menunggu Diproses' AND NEW.status = 'Siap Diambil')
      OR (OLD.status = 'Siap Diambil'      AND NEW.status = 'Sudah Diambil')
    ) THEN
      RAISE EXCEPTION 'Perpindahan status resep dari % ke % tidak diizinkan', OLD.status, NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'Menunggu Diproses' AND NEW.status = 'Siap Diambil' THEN
    NEW.tanggal_siap := COALESCE(NEW.tanggal_siap, NOW());

    FOR item IN
      SELECT obat_id, jumlah FROM resep_item WHERE resep_id = NEW.id
    LOOP
      PERFORM 1 FROM obat WHERE id = item.obat_id AND stok >= item.jumlah FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stok obat (id %) tidak mencukupi untuk resep ini', item.obat_id;
      END IF;
      UPDATE obat SET stok = stok - item.jumlah WHERE id = item.obat_id;
    END LOOP;
  END IF;

  IF OLD.status = 'Siap Diambil' AND NEW.status = 'Sudah Diambil' THEN
    NEW.tanggal_diambil := COALESCE(NEW.tanggal_diambil, NOW());
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_resep_status() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dokter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dokter (
    user_id integer NOT NULL,
    poli_id integer NOT NULL
);


ALTER TABLE public.dokter OWNER TO postgres;

--
-- Name: jadwal_dokter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jadwal_dokter (
    id integer NOT NULL,
    dokter_id integer NOT NULL,
    hari character varying(10) NOT NULL,
    jam_mulai time without time zone NOT NULL,
    jam_selesai time without time zone NOT NULL,
    CONSTRAINT chk_durasi_30_menit CHECK ((jam_selesai = (jam_mulai + '00:30:00'::interval))),
    CONSTRAINT chk_slot_30_menit CHECK (((EXTRACT(minute FROM jam_mulai) = ANY (ARRAY[(0)::numeric, (30)::numeric])) AND (EXTRACT(second FROM jam_mulai) = (0)::numeric))),
    CONSTRAINT jadwal_dokter_hari_check CHECK (((hari)::text = ANY ((ARRAY['Senin'::character varying, 'Selasa'::character varying, 'Rabu'::character varying, 'Kamis'::character varying, 'Jumat'::character varying, 'Sabtu'::character varying, 'Minggu'::character varying])::text[])))
);


ALTER TABLE public.jadwal_dokter OWNER TO postgres;

--
-- Name: jadwal_dokter_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jadwal_dokter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jadwal_dokter_id_seq OWNER TO postgres;

--
-- Name: jadwal_dokter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jadwal_dokter_id_seq OWNED BY public.jadwal_dokter.id;


--
-- Name: janji_temu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.janji_temu (
    id integer NOT NULL,
    pasien_id integer NOT NULL,
    dokter_id integer NOT NULL,
    jadwal_id integer NOT NULL,
    tanggal_booking date NOT NULL,
    keluhan_singkat text NOT NULL,
    status character varying(12) DEFAULT 'Pending'::character varying NOT NULL,
    alasan_penolakan text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone,
    CONSTRAINT chk_alasan_tolak CHECK ((((status)::text <> 'Rejected'::text) OR (alasan_penolakan IS NOT NULL))),
    CONSTRAINT janji_temu_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying, 'Selesai'::character varying, 'Dibatalkan'::character varying])::text[])))
);


ALTER TABLE public.janji_temu OWNER TO postgres;

--
-- Name: notifikasi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifikasi (
    id integer NOT NULL,
    user_id integer NOT NULL,
    judul character varying(150) NOT NULL,
    pesan text NOT NULL,
    sudah_dibaca boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifikasi OWNER TO postgres;

--
-- Name: notifikasi_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifikasi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifikasi_id_seq OWNER TO postgres;

--
-- Name: notifikasi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifikasi_id_seq OWNED BY public.notifikasi.id;


--
-- Name: obat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.obat (
    id integer NOT NULL,
    nama_obat character varying(150) NOT NULL,
    deskripsi text,
    tipe character varying(10) NOT NULL,
    stok integer DEFAULT 0 NOT NULL,
    gambar character varying(255),
    tanggal_kadaluarsa date,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT obat_stok_check CHECK ((stok >= 0)),
    CONSTRAINT obat_tipe_check CHECK (((tipe)::text = ANY ((ARRAY['keras'::character varying, 'biasa'::character varying])::text[])))
);


ALTER TABLE public.obat OWNER TO postgres;

--
-- Name: obat_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.obat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.obat_id_seq OWNER TO postgres;

--
-- Name: obat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.obat_id_seq OWNED BY public.obat.id;


--
-- Name: poli; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.poli (
    id integer NOT NULL,
    nama_poli character varying(100) NOT NULL,
    deskripsi text,
    ikon character varying(255)
);


ALTER TABLE public.poli OWNER TO postgres;

--
-- Name: poli_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.poli_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.poli_id_seq OWNER TO postgres;

--
-- Name: poli_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.poli_id_seq OWNED BY public.poli.id;


--
-- Name: rekam_medis; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rekam_medis (
    id integer NOT NULL,
    janji_temu_id integer NOT NULL,
    pasien_id integer NOT NULL,
    dokter_id integer NOT NULL,
    diagnosis text NOT NULL,
    tindakan_medis text NOT NULL,
    catatan text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rekam_medis OWNER TO postgres;

--
-- Name: rekam_medis_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rekam_medis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rekam_medis_id_seq OWNER TO postgres;

--
-- Name: rekam_medis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rekam_medis_id_seq OWNED BY public.rekam_medis.id;


--
-- Name: resep; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resep (
    id integer NOT NULL,
    rekam_medis_id integer NOT NULL,
    status character varying(20) DEFAULT 'Menunggu Diproses'::character varying NOT NULL,
    tanggal_siap timestamp without time zone,
    tanggal_diambil timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_urutan_resep CHECK (((((status)::text = 'Menunggu Diproses'::text) AND (tanggal_siap IS NULL) AND (tanggal_diambil IS NULL)) OR (((status)::text = 'Siap Diambil'::text) AND (tanggal_siap IS NOT NULL) AND (tanggal_diambil IS NULL)) OR (((status)::text = 'Sudah Diambil'::text) AND (tanggal_siap IS NOT NULL) AND (tanggal_diambil IS NOT NULL)))),
    CONSTRAINT resep_status_check CHECK (((status)::text = ANY ((ARRAY['Menunggu Diproses'::character varying, 'Siap Diambil'::character varying, 'Sudah Diambil'::character varying])::text[])))
);


ALTER TABLE public.resep OWNER TO postgres;

--
-- Name: resep_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resep_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resep_id_seq OWNER TO postgres;

--
-- Name: resep_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resep_id_seq OWNED BY public.resep.id;


--
-- Name: resep_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resep_item (
    id integer NOT NULL,
    resep_id integer NOT NULL,
    obat_id integer NOT NULL,
    jumlah integer NOT NULL,
    CONSTRAINT resep_item_jumlah_check CHECK ((jumlah > 0))
);


ALTER TABLE public.resep_item OWNER TO postgres;

--
-- Name: resep_item_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resep_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resep_item_id_seq OWNER TO postgres;

--
-- Name: resep_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resep_item_id_seq OWNED BY public.resep_item.id;


--
-- Name: ulasan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ulasan (
    id integer NOT NULL,
    janji_temu_id integer NOT NULL,
    rating smallint NOT NULL,
    komentar text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ulasan_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.ulasan OWNER TO postgres;

--
-- Name: ulasan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ulasan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ulasan_id_seq OWNER TO postgres;

--
-- Name: ulasan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ulasan_id_seq OWNED BY public.ulasan.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(120) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nama_lengkap character varying(120) NOT NULL,
    role character varying(10) NOT NULL,
    telepon character varying(20),
    alamat text,
    foto character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'dokter'::character varying, 'pasien'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: jadwal_dokter id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jadwal_dokter ALTER COLUMN id SET DEFAULT nextval('public.jadwal_dokter_id_seq'::regclass);


--
-- Name: notifikasi id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifikasi ALTER COLUMN id SET DEFAULT nextval('public.notifikasi_id_seq'::regclass);


--
-- Name: obat id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obat ALTER COLUMN id SET DEFAULT nextval('public.obat_id_seq'::regclass);


--
-- Name: poli id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poli ALTER COLUMN id SET DEFAULT nextval('public.poli_id_seq'::regclass);


--
-- Name: rekam_medis id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rekam_medis ALTER COLUMN id SET DEFAULT nextval('public.rekam_medis_id_seq'::regclass);


--
-- Name: resep id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep ALTER COLUMN id SET DEFAULT nextval('public.resep_id_seq'::regclass);


--
-- Name: resep_item id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep_item ALTER COLUMN id SET DEFAULT nextval('public.resep_item_id_seq'::regclass);


--
-- Name: ulasan id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ulasan ALTER COLUMN id SET DEFAULT nextval('public.ulasan_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: dokter; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dokter (user_id, poli_id) FROM stdin;
3	1
4	2
\.


--
-- Data for Name: jadwal_dokter; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jadwal_dokter (id, dokter_id, hari, jam_mulai, jam_selesai) FROM stdin;
1	3	Senin	08:00:00	08:30:00
2	3	Senin	08:30:00	09:00:00
3	3	Senin	09:00:00	09:30:00
4	3	Rabu	08:00:00	08:30:00
5	3	Rabu	08:30:00	09:00:00
6	3	Rabu	09:00:00	09:30:00
7	3	Jumat	08:00:00	08:30:00
8	3	Jumat	08:30:00	09:00:00
9	3	Jumat	09:00:00	09:30:00
\.


--
-- Data for Name: janji_temu; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.janji_temu (id, pasien_id, dokter_id, jadwal_id, tanggal_booking, keluhan_singkat, status, alasan_penolakan, created_at, updated_at) FROM stdin;
1	8	3	7	2026-11-20	Demam dan flu sejak kemarin	Approved	\N	2026-11-16 01:05:14.652495	2026-11-16 01:05:15.428367
2	10	3	8	2026-11-20	Batuk berdahak dan sakit kepala	Selesai	\N	2026-11-16 01:30:13.943642	2026-11-16 01:30:14.122386
\.


--
-- Data for Name: notifikasi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifikasi (id, user_id, judul, pesan, sudah_dibaca, created_at) FROM stdin;
1	3	Janji Temu Baru	Pasien Siti Rahmawati membuat janji temu baru untuk tanggal 2026-11-20 (08:00 - 08:30).	f	2026-11-16 01:05:14.660892
2	8	Janji Temu Disetujui	Janji temu Anda dengan Dr. Dr. Sarah Wijaya, Sp.PD pada tanggal 2026-11-19 telah disetujui.	f	2026-11-16 01:05:15.434448
3	3	Janji Temu Baru	Pasien Dewi Lestari membuat janji temu baru untuk tanggal 2026-11-20 (08:30 - 09:00).	f	2026-11-16 01:30:13.946028
4	10	Janji Temu Disetujui	Janji temu Anda dengan Dr. Dr. Sarah Wijaya, Sp.PD pada tanggal 2026-11-19 telah disetujui.	f	2026-11-16 01:30:14.061892
5	10	Resep Obat Siap Diambil	Resep obat Anda telah disiapkan oleh bagian farmasi dan sekarang siap untuk diambil di loket obat.	f	2026-11-16 01:30:16.174142
\.


--
-- Data for Name: obat; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.obat (id, nama_obat, deskripsi, tipe, stok, gambar, tanggal_kadaluarsa, created_at) FROM stdin;
1	Paracetamol 500 mg	Penurun demam dan pereda nyeri	biasa	200	\N	2027-12-31	2026-11-15 23:06:37.009594
3	Vitamin C 500 mg	Suplemen vitamin C	biasa	300	\N	2026-10-31	2026-11-15 23:06:37.009594
2	Amoxicillin 500 mg	Antibiotik untuk infeksi bakteri	keras	118	\N	2027-06-30	2026-11-15 23:06:37.009594
\.


--
-- Data for Name: poli; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.poli (id, nama_poli, deskripsi, ikon) FROM stdin;
1	Poli Umum	Pemeriksaan kesehatan umum dan pengobatan dasar	\N
2	Poli Gigi	Perawatan dan pemeriksaan kesehatan gigi dan mulut	\N
3	Poli Anak	Pelayanan kesehatan untuk bayi, balita, dan anak	\N
\.


--
-- Data for Name: rekam_medis; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rekam_medis (id, janji_temu_id, pasien_id, dokter_id, diagnosis, tindakan_medis, catatan, created_at) FROM stdin;
1	2	10	3	Bronkitis Akut Ringan	Auskultasi paru dan edukasi istirahat	Habiskan antibiotik dan kontrol bila belum membaik	2026-11-16 01:30:14.122386
\.


--
-- Data for Name: resep; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resep (id, rekam_medis_id, status, tanggal_siap, tanggal_diambil, created_at) FROM stdin;
1	1	Sudah Diambil	2026-11-16 01:30:16.171567	2026-11-16 01:30:16.772568	2026-11-16 01:30:14.122386
\.


--
-- Data for Name: resep_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resep_item (id, resep_id, obat_id, jumlah) FROM stdin;
1	1	2	2
\.


--
-- Data for Name: ulasan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ulasan (id, janji_temu_id, rating, komentar, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, nama_lengkap, role, telepon, alamat, foto, created_at) FROM stdin;
1	admin	admin@rumahsakit.local	$2b$10$IPW2MyHk13UYKbAhbg8.DuxP7A6gTyLsZAe2HYTASyVSYuujrZ3QK	Administrator	admin	\N	\N	\N	2026-11-15 23:06:37.009594
2	testpasien_1794762102411	testpasien_1794762102411@hospital.test	$2b$10$0R/26AKLV96csYCDsizoKeR0/R1zmBVPYZggHabLzEzR5SNYtr1Am	Budi Pasien Uji	pasien	081234567890	Jl. Uji Klinis No. 99	\N	2026-11-16 01:01:43.055419
3	dr_sarah	dr.sarah@rumahsakit.local	$2b$10$iwu9G.H5WaLFFJ0z3f4IzupN6/hOFvuyJLsfkysJxU3WZqHOOBs36	Dr. Sarah Wijaya, Sp.PD	dokter	081200000002	\N	\N	2026-11-16 01:02:21.979717
4	dr_budi	dr.budi@rumahsakit.local	$2b$10$vvJsZqOHHFEq5F3JEkhvk.nOKn9ygddu2gkSXG2EggQpwBqcihuBO	Drg. Budi Santoso, Sp.KG	dokter	081200000003	\N	\N	2026-11-16 01:02:22.109199
5	johndoe	john@email.com	$2b$10$wuy5Tp1Otav1DZ3RMiBLnOnmrntAvITZ/QSYujW10ziV44MhdacCW	John Doe	pasien	081234567890	Jl. Merdeka No. 10	\N	2026-11-16 01:02:22.19369
6	pasien_uji_1794762175696	pasien_uji_1794762175696@hospital.test	$2b$10$A8NK4US6WHrr6v0BFxx2vuwbpLOgGRXFSDlF3/y20Tnvx4XipF4be	Siti Rahmawati	pasien	081299887766	Jl. Melati Indah No. 5	\N	2026-11-16 01:02:55.979128
7	pasien_uji_1794762216270	pasien_uji_1794762216270@hospital.test	$2b$10$Nuc1.tam9CxDkFjR4gVMe.fmSNKD1NYvjIOU/DsGSzEa.Aqh.c4z.	Siti Rahmawati	pasien	081299887766	Jl. Melati Indah No. 5	\N	2026-11-16 01:03:36.503642
8	pasien_uji_1794762314294	pasien_uji_1794762314294@hospital.test	$2b$10$SFJgo/6ommisSvJG7KFF0uXA4EnaGYI0sYqNAlX0SsXoDKngke/VG	Siti Rahmawati	pasien	081299887766	Jl. Melati Indah No. 5	\N	2026-11-16 01:05:14.588781
9	pasien_final_1794762395327	pasien_final_1794762395327@hospital.test	$2b$10$HOg6UD2HoC8XMSqcsbLmSOMi8jkHZIKW3frSWSFsmQf2oIjBB12Xa	Siti Rahmawati	pasien	081299887766	Jl. Melati Indah No. 5	\N	2026-11-16 01:06:35.563846
10	pasien_sukses_1794763813672	pasien_sukses_1794763813672@hospital.test	$2b$10$NUutU5JdfCL01mNZtchMleNqvM6z.u2Q8xENP2qQGhc9QOqxjbXnm	Dewi Lestari	pasien	081299881122	Jl. Melati No. 8	\N	2026-11-16 01:30:13.899384
\.


--
-- Name: jadwal_dokter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jadwal_dokter_id_seq', 9, true);


--
-- Name: notifikasi_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifikasi_id_seq', 5, true);


--
-- Name: obat_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.obat_id_seq', 3, true);


--
-- Name: poli_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.poli_id_seq', 4, true);


--
-- Name: rekam_medis_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rekam_medis_id_seq', 1, true);


--
-- Name: resep_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.resep_id_seq', 1, true);


--
-- Name: resep_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.resep_item_id_seq', 1, true);


--
-- Name: ulasan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ulasan_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 10, true);


--
-- Name: dokter dokter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dokter
    ADD CONSTRAINT dokter_pkey PRIMARY KEY (user_id);


--
-- Name: jadwal_dokter jadwal_dokter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jadwal_dokter
    ADD CONSTRAINT jadwal_dokter_pkey PRIMARY KEY (id);


--
-- Name: janji_temu janji_temu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.janji_temu
    ADD CONSTRAINT janji_temu_pkey PRIMARY KEY (id);


--
-- Name: notifikasi notifikasi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifikasi
    ADD CONSTRAINT notifikasi_pkey PRIMARY KEY (id);


--
-- Name: obat obat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.obat
    ADD CONSTRAINT obat_pkey PRIMARY KEY (id);


--
-- Name: poli poli_nama_poli_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poli
    ADD CONSTRAINT poli_nama_poli_key UNIQUE (nama_poli);


--
-- Name: poli poli_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poli
    ADD CONSTRAINT poli_pkey PRIMARY KEY (id);


--
-- Name: rekam_medis rekam_medis_janji_temu_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rekam_medis
    ADD CONSTRAINT rekam_medis_janji_temu_id_key UNIQUE (janji_temu_id);


--
-- Name: rekam_medis rekam_medis_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rekam_medis
    ADD CONSTRAINT rekam_medis_pkey PRIMARY KEY (id);


--
-- Name: resep_item resep_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep_item
    ADD CONSTRAINT resep_item_pkey PRIMARY KEY (id);


--
-- Name: resep resep_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_pkey PRIMARY KEY (id);


--
-- Name: resep resep_rekam_medis_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_rekam_medis_id_key UNIQUE (rekam_medis_id);


--
-- Name: ulasan ulasan_janji_temu_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ulasan
    ADD CONSTRAINT ulasan_janji_temu_id_key UNIQUE (janji_temu_id);


--
-- Name: ulasan ulasan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ulasan
    ADD CONSTRAINT ulasan_pkey PRIMARY KEY (id);


--
-- Name: jadwal_dokter uq_jadwal_id_dokter; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jadwal_dokter
    ADD CONSTRAINT uq_jadwal_id_dokter UNIQUE (id, dokter_id);


--
-- Name: jadwal_dokter uq_jadwal_slot; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jadwal_dokter
    ADD CONSTRAINT uq_jadwal_slot UNIQUE (dokter_id, hari, jam_mulai);


--
-- Name: janji_temu uq_janji_id_pasien_dokter; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.janji_temu
    ADD CONSTRAINT uq_janji_id_pasien_dokter UNIQUE (id, pasien_id, dokter_id);


--
-- Name: resep_item uq_resep_obat; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep_item
    ADD CONSTRAINT uq_resep_obat UNIQUE (resep_id, obat_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_janji_dokter_tanggal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_janji_dokter_tanggal ON public.janji_temu USING btree (dokter_id, tanggal_booking, status);


--
-- Name: idx_janji_pasien; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_janji_pasien ON public.janji_temu USING btree (pasien_id, created_at);


--
-- Name: idx_notifikasi_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifikasi_user ON public.notifikasi USING btree (user_id, sudah_dibaca);


--
-- Name: idx_obat_nama; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_obat_nama ON public.obat USING btree (nama_obat);


--
-- Name: idx_rekam_dokter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rekam_dokter ON public.rekam_medis USING btree (dokter_id, created_at);


--
-- Name: idx_rekam_pasien; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rekam_pasien ON public.rekam_medis USING btree (pasien_id, created_at);


--
-- Name: idx_resep_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_resep_status ON public.resep USING btree (status);


--
-- Name: uq_janji_slot_aktif; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_janji_slot_aktif ON public.janji_temu USING btree (jadwal_id, tanggal_booking) WHERE ((status)::text = ANY ((ARRAY['Pending'::character varying, 'Approved'::character varying, 'Selesai'::character varying])::text[]));


--
-- Name: rekam_medis trg_rekam_medis_permanen; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_rekam_medis_permanen BEFORE DELETE OR UPDATE ON public.rekam_medis FOR EACH ROW EXECUTE FUNCTION public.fn_arsip_permanen();


--
-- Name: rekam_medis trg_rekam_medis_sebelum_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_rekam_medis_sebelum_insert BEFORE INSERT ON public.rekam_medis FOR EACH ROW EXECUTE FUNCTION public.fn_rekam_medis_baru();


--
-- Name: rekam_medis trg_rekam_medis_setelah_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_rekam_medis_setelah_insert AFTER INSERT ON public.rekam_medis FOR EACH ROW EXECUTE FUNCTION public.fn_rekam_medis_setelah_insert();


--
-- Name: resep_item trg_resep_item_permanen; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_resep_item_permanen BEFORE DELETE OR UPDATE ON public.resep_item FOR EACH ROW EXECUTE FUNCTION public.fn_arsip_permanen();


--
-- Name: resep trg_resep_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_resep_status BEFORE UPDATE OF status ON public.resep FOR EACH ROW EXECUTE FUNCTION public.fn_resep_status();


--
-- Name: dokter dokter_poli_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dokter
    ADD CONSTRAINT dokter_poli_id_fkey FOREIGN KEY (poli_id) REFERENCES public.poli(id) ON DELETE RESTRICT;


--
-- Name: dokter dokter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dokter
    ADD CONSTRAINT dokter_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: janji_temu fk_janji_jadwal; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.janji_temu
    ADD CONSTRAINT fk_janji_jadwal FOREIGN KEY (jadwal_id, dokter_id) REFERENCES public.jadwal_dokter(id, dokter_id) ON DELETE RESTRICT;


--
-- Name: rekam_medis fk_rekam_janji; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rekam_medis
    ADD CONSTRAINT fk_rekam_janji FOREIGN KEY (janji_temu_id, pasien_id, dokter_id) REFERENCES public.janji_temu(id, pasien_id, dokter_id) ON DELETE RESTRICT;


--
-- Name: jadwal_dokter jadwal_dokter_dokter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jadwal_dokter
    ADD CONSTRAINT jadwal_dokter_dokter_id_fkey FOREIGN KEY (dokter_id) REFERENCES public.dokter(user_id) ON DELETE CASCADE;


--
-- Name: janji_temu janji_temu_pasien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.janji_temu
    ADD CONSTRAINT janji_temu_pasien_id_fkey FOREIGN KEY (pasien_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: notifikasi notifikasi_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifikasi
    ADD CONSTRAINT notifikasi_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resep_item resep_item_obat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep_item
    ADD CONSTRAINT resep_item_obat_id_fkey FOREIGN KEY (obat_id) REFERENCES public.obat(id) ON DELETE RESTRICT;


--
-- Name: resep_item resep_item_resep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep_item
    ADD CONSTRAINT resep_item_resep_id_fkey FOREIGN KEY (resep_id) REFERENCES public.resep(id) ON DELETE RESTRICT;


--
-- Name: resep resep_rekam_medis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resep
    ADD CONSTRAINT resep_rekam_medis_id_fkey FOREIGN KEY (rekam_medis_id) REFERENCES public.rekam_medis(id) ON DELETE RESTRICT;


--
-- Name: ulasan ulasan_janji_temu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ulasan
    ADD CONSTRAINT ulasan_janji_temu_id_fkey FOREIGN KEY (janji_temu_id) REFERENCES public.janji_temu(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict HnB1WLhw4Vds77TBOdpv7OnzsjVWl2k6z2tb99Gva1qD1YNvmTwX9eAl2j1fUvj

