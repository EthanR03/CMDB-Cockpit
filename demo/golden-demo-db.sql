--
-- PostgreSQL database dump
--

\restrict Dhu8Slqf8JgtGfh6EiEgd9zsz2FMqKBJZ9ZOpFhMoesoLnkbWeOsjIkZ5rX3ykV

-- Dumped from database version 17.10 (Homebrew)
-- Dumped by pg_dump version 17.10 (Homebrew)

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: ethanrivera
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO ethanrivera;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: ethanrivera
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_run; Type: TABLE; Schema: public; Owner: ethanrivera
--

CREATE TABLE public.agent_run (
    id integer NOT NULL,
    team_tag text DEFAULT 'hackathon'::text NOT NULL,
    agent text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    summary text,
    stats jsonb,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone
);


ALTER TABLE public.agent_run OWNER TO ethanrivera;

--
-- Name: agent_run_completeness_snapshot; Type: TABLE; Schema: public; Owner: ethanrivera
--

CREATE TABLE public.agent_run_completeness_snapshot (
    id integer NOT NULL,
    agent_run_id integer NOT NULL,
    team_tag text DEFAULT 'hackathon'::text NOT NULL,
    ci_class text NOT NULL,
    phase text NOT NULL,
    total_count integer NOT NULL,
    complete_count integer NOT NULL,
    completeness_percent integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_run_completeness_snapshot_counts_check CHECK (((total_count >= 0) AND (complete_count >= 0) AND (complete_count <= total_count))),
    CONSTRAINT agent_run_completeness_snapshot_percent_check CHECK (((completeness_percent >= 0) AND (completeness_percent <= 100))),
    CONSTRAINT agent_run_completeness_snapshot_phase_check CHECK ((phase = ANY (ARRAY['before'::text, 'after'::text])))
);


ALTER TABLE public.agent_run_completeness_snapshot OWNER TO ethanrivera;

--
-- Name: agent_run_completeness_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: ethanrivera
--

CREATE SEQUENCE public.agent_run_completeness_snapshot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agent_run_completeness_snapshot_id_seq OWNER TO ethanrivera;

--
-- Name: agent_run_completeness_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ethanrivera
--

ALTER SEQUENCE public.agent_run_completeness_snapshot_id_seq OWNED BY public.agent_run_completeness_snapshot.id;


--
-- Name: agent_run_id_seq; Type: SEQUENCE; Schema: public; Owner: ethanrivera
--

CREATE SEQUENCE public.agent_run_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agent_run_id_seq OWNER TO ethanrivera;

--
-- Name: agent_run_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ethanrivera
--

ALTER SEQUENCE public.agent_run_id_seq OWNED BY public.agent_run.id;


--
-- Name: decision; Type: TABLE; Schema: public; Owner: ethanrivera
--

CREATE TABLE public.decision (
    id integer NOT NULL,
    team_tag text DEFAULT 'hackathon'::text NOT NULL,
    entity_type text NOT NULL,
    entity_id integer NOT NULL,
    decision text NOT NULL,
    decided_by text DEFAULT 'reviewer'::text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.decision OWNER TO ethanrivera;

--
-- Name: decision_id_seq; Type: SEQUENCE; Schema: public; Owner: ethanrivera
--

CREATE SEQUENCE public.decision_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.decision_id_seq OWNER TO ethanrivera;

--
-- Name: decision_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ethanrivera
--

ALTER SEQUENCE public.decision_id_seq OWNED BY public.decision.id;


--
-- Name: dup_cluster; Type: TABLE; Schema: public; Owner: ethanrivera
--

CREATE TABLE public.dup_cluster (
    id integer NOT NULL,
    team_tag text DEFAULT 'hackathon'::text NOT NULL,
    cluster_key text NOT NULL,
    ci_ids jsonb NOT NULL,
    survivor_id integer,
    confidence numeric,
    rationale text,
    evidence jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dup_cluster OWNER TO ethanrivera;

--
-- Name: dup_cluster_id_seq; Type: SEQUENCE; Schema: public; Owner: ethanrivera
--

CREATE SEQUENCE public.dup_cluster_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dup_cluster_id_seq OWNER TO ethanrivera;

--
-- Name: dup_cluster_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ethanrivera
--

ALTER SEQUENCE public.dup_cluster_id_seq OWNED BY public.dup_cluster.id;


--
-- Name: finding; Type: TABLE; Schema: public; Owner: ethanrivera
--

CREATE TABLE public.finding (
    id integer NOT NULL,
    team_tag text DEFAULT 'hackathon'::text NOT NULL,
    ci_id integer NOT NULL,
    category text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    field text,
    message text NOT NULL,
    agent text DEFAULT 'profiler'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.finding OWNER TO ethanrivera;

--
-- Name: finding_id_seq; Type: SEQUENCE; Schema: public; Owner: ethanrivera
--

CREATE SEQUENCE public.finding_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.finding_id_seq OWNER TO ethanrivera;

--
-- Name: finding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ethanrivera
--

ALTER SEQUENCE public.finding_id_seq OWNED BY public.finding.id;


--
-- Name: ire_rule_proposal; Type: TABLE; Schema: public; Owner: ethanrivera
--

CREATE TABLE public.ire_rule_proposal (
    id integer NOT NULL,
    team_tag text DEFAULT 'hackathon'::text NOT NULL,
    ci_class text NOT NULL,
    rule_name text NOT NULL,
    criteria jsonb NOT NULL,
    coverage jsonb,
    rationale text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sn_sync_status text,
    sn_sync_error text,
    sn_identifier_sys_id text,
    sn_entry_sys_ids jsonb
);


ALTER TABLE public.ire_rule_proposal OWNER TO ethanrivera;

--
-- Name: ire_rule_proposal_id_seq; Type: SEQUENCE; Schema: public; Owner: ethanrivera
--

CREATE SEQUENCE public.ire_rule_proposal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ire_rule_proposal_id_seq OWNER TO ethanrivera;

--
-- Name: ire_rule_proposal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ethanrivera
--

ALTER SEQUENCE public.ire_rule_proposal_id_seq OWNED BY public.ire_rule_proposal.id;


--
-- Name: remediation; Type: TABLE; Schema: public; Owner: ethanrivera
--

CREATE TABLE public.remediation (
    id integer NOT NULL,
    team_tag text DEFAULT 'hackathon'::text NOT NULL,
    action_type text NOT NULL,
    target_ci_id integer,
    payload jsonb,
    status text DEFAULT 'queued'::text NOT NULL,
    rollback jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_at timestamp with time zone,
    sn_promotion_status text,
    sn_result jsonb
);


ALTER TABLE public.remediation OWNER TO ethanrivera;

--
-- Name: remediation_id_seq; Type: SEQUENCE; Schema: public; Owner: ethanrivera
--

CREATE SEQUENCE public.remediation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.remediation_id_seq OWNER TO ethanrivera;

--
-- Name: remediation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ethanrivera
--

ALTER SEQUENCE public.remediation_id_seq OWNED BY public.remediation.id;


--
-- Name: staging_ci; Type: TABLE; Schema: public; Owner: ethanrivera
--

CREATE TABLE public.staging_ci (
    id integer NOT NULL,
    team_tag text DEFAULT 'hackathon'::text NOT NULL,
    source text DEFAULT 'seed_bundle'::text NOT NULL,
    ci_class text NOT NULL,
    name text NOT NULL,
    serial_number text,
    mac_address text,
    ip_address text,
    fqdn text,
    port integer,
    url text,
    owner text,
    support_group text,
    environment text,
    lifecycle_status text,
    os text,
    model text,
    location text,
    last_discovered timestamp with time zone,
    raw jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staging_ci OWNER TO ethanrivera;

--
-- Name: staging_ci_id_seq; Type: SEQUENCE; Schema: public; Owner: ethanrivera
--

CREATE SEQUENCE public.staging_ci_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staging_ci_id_seq OWNER TO ethanrivera;

--
-- Name: staging_ci_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ethanrivera
--

ALTER SEQUENCE public.staging_ci_id_seq OWNED BY public.staging_ci.id;


--
-- Name: topology_proposal; Type: TABLE; Schema: public; Owner: ethanrivera
--

CREATE TABLE public.topology_proposal (
    id integer NOT NULL,
    team_tag text DEFAULT 'hackathon'::text NOT NULL,
    service_name text NOT NULL,
    member_ci_ids jsonb NOT NULL,
    relationships jsonb,
    endpoints jsonb,
    rationale text,
    confidence numeric,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.topology_proposal OWNER TO ethanrivera;

--
-- Name: topology_proposal_id_seq; Type: SEQUENCE; Schema: public; Owner: ethanrivera
--

CREATE SEQUENCE public.topology_proposal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.topology_proposal_id_seq OWNER TO ethanrivera;

--
-- Name: topology_proposal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ethanrivera
--

ALTER SEQUENCE public.topology_proposal_id_seq OWNED BY public.topology_proposal.id;


--
-- Name: agent_run id; Type: DEFAULT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.agent_run ALTER COLUMN id SET DEFAULT nextval('public.agent_run_id_seq'::regclass);


--
-- Name: agent_run_completeness_snapshot id; Type: DEFAULT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.agent_run_completeness_snapshot ALTER COLUMN id SET DEFAULT nextval('public.agent_run_completeness_snapshot_id_seq'::regclass);


--
-- Name: decision id; Type: DEFAULT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.decision ALTER COLUMN id SET DEFAULT nextval('public.decision_id_seq'::regclass);


--
-- Name: dup_cluster id; Type: DEFAULT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.dup_cluster ALTER COLUMN id SET DEFAULT nextval('public.dup_cluster_id_seq'::regclass);


--
-- Name: finding id; Type: DEFAULT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.finding ALTER COLUMN id SET DEFAULT nextval('public.finding_id_seq'::regclass);


--
-- Name: ire_rule_proposal id; Type: DEFAULT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.ire_rule_proposal ALTER COLUMN id SET DEFAULT nextval('public.ire_rule_proposal_id_seq'::regclass);


--
-- Name: remediation id; Type: DEFAULT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.remediation ALTER COLUMN id SET DEFAULT nextval('public.remediation_id_seq'::regclass);


--
-- Name: staging_ci id; Type: DEFAULT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.staging_ci ALTER COLUMN id SET DEFAULT nextval('public.staging_ci_id_seq'::regclass);


--
-- Name: topology_proposal id; Type: DEFAULT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.topology_proposal ALTER COLUMN id SET DEFAULT nextval('public.topology_proposal_id_seq'::regclass);


--
-- Data for Name: agent_run; Type: TABLE DATA; Schema: public; Owner: ethanrivera
--

COPY public.agent_run (id, team_tag, agent, status, summary, stats, started_at, finished_at) FROM stdin;
21	hackathon	profiler	succeeded	Filed 58 findings across 47 CIs	{"findings": 58, "cisScanned": 113}	2026-07-22 14:11:29.260518-07	2026-07-22 14:12:01.223-07
22	hackathon	identity	succeeded	Proposed 6 duplicate clusters from 12 candidate groups	{"clusters": 6, "candidateGroups": 12}	2026-07-22 14:12:01.226687-07	2026-07-22 14:12:07.727-07
23	hackathon	rulewright	succeeded	Authored 7 IRE rule proposals covering 7 CI classes	{"rules": 7, "classes": 7}	2026-07-22 14:12:07.729061-07	2026-07-22 14:12:15.152-07
24	hackathon	cartographer	succeeded	Mapped 3 candidate services from 113 staged CIs	{"services": 3, "cisScanned": 113}	2026-07-22 14:12:15.153691-07	2026-07-22 14:12:23.75-07
25	hackathon	profiler	succeeded	Filed 63 findings across 52 CIs	{"findings": 63, "cisScanned": 113}	2026-07-22 23:25:35.490547-07	2026-07-22 23:26:04.128-07
26	hackathon	identity	succeeded	Proposed 6 duplicate clusters from 12 candidate groups	{"clusters": 6, "candidateGroups": 12}	2026-07-22 23:26:04.132066-07	2026-07-22 23:26:14.201-07
27	hackathon	rulewright	succeeded	Authored 7 IRE rule proposals covering 7 CI classes	{"rules": 7, "classes": 7}	2026-07-22 23:26:14.204426-07	2026-07-22 23:26:25.975-07
28	hackathon	cartographer	succeeded	Mapped 3 candidate services from 113 staged CIs	{"services": 3, "cisScanned": 113}	2026-07-22 23:26:25.977411-07	2026-07-22 23:26:32.573-07
\.


--
-- Data for Name: agent_run_completeness_snapshot; Type: TABLE DATA; Schema: public; Owner: ethanrivera
--

COPY public.agent_run_completeness_snapshot (id, agent_run_id, team_tag, ci_class, phase, total_count, complete_count, completeness_percent, created_at) FROM stdin;
1	21	hackathon	cmdb_ci_appl	before	6	0	0	2026-07-22 14:11:29.266237-07
2	21	hackathon	cmdb_ci_db_instance	before	9	3	33	2026-07-22 14:11:29.266237-07
3	21	hackathon	cmdb_ci_lb	before	3	0	0	2026-07-22 14:11:29.266237-07
4	21	hackathon	cmdb_ci_linux_server	before	45	10	22	2026-07-22 14:11:29.266237-07
5	21	hackathon	cmdb_ci_netgear	before	12	0	0	2026-07-22 14:11:29.266237-07
6	21	hackathon	cmdb_ci_server	before	6	0	0	2026-07-22 14:11:29.266237-07
7	21	hackathon	cmdb_ci_win_server	before	32	2	6	2026-07-22 14:11:29.266237-07
8	21	hackathon	cmdb_ci_appl	after	6	0	0	2026-07-22 14:12:01.211221-07
9	21	hackathon	cmdb_ci_db_instance	after	9	3	33	2026-07-22 14:12:01.211221-07
10	21	hackathon	cmdb_ci_lb	after	3	0	0	2026-07-22 14:12:01.211221-07
11	21	hackathon	cmdb_ci_linux_server	after	45	10	22	2026-07-22 14:12:01.211221-07
12	21	hackathon	cmdb_ci_netgear	after	12	0	0	2026-07-22 14:12:01.211221-07
13	21	hackathon	cmdb_ci_server	after	6	0	0	2026-07-22 14:12:01.211221-07
14	21	hackathon	cmdb_ci_win_server	after	32	2	6	2026-07-22 14:12:01.211221-07
15	22	hackathon	cmdb_ci_appl	before	6	0	0	2026-07-22 14:12:01.227445-07
16	22	hackathon	cmdb_ci_db_instance	before	9	3	33	2026-07-22 14:12:01.227445-07
17	22	hackathon	cmdb_ci_lb	before	3	0	0	2026-07-22 14:12:01.227445-07
18	22	hackathon	cmdb_ci_linux_server	before	45	10	22	2026-07-22 14:12:01.227445-07
19	22	hackathon	cmdb_ci_netgear	before	12	0	0	2026-07-22 14:12:01.227445-07
20	22	hackathon	cmdb_ci_server	before	6	0	0	2026-07-22 14:12:01.227445-07
21	22	hackathon	cmdb_ci_win_server	before	32	2	6	2026-07-22 14:12:01.227445-07
22	22	hackathon	cmdb_ci_appl	after	6	0	0	2026-07-22 14:12:07.716978-07
23	22	hackathon	cmdb_ci_db_instance	after	9	3	33	2026-07-22 14:12:07.716978-07
24	22	hackathon	cmdb_ci_lb	after	3	0	0	2026-07-22 14:12:07.716978-07
25	22	hackathon	cmdb_ci_linux_server	after	45	10	22	2026-07-22 14:12:07.716978-07
26	22	hackathon	cmdb_ci_netgear	after	12	0	0	2026-07-22 14:12:07.716978-07
27	22	hackathon	cmdb_ci_server	after	6	0	0	2026-07-22 14:12:07.716978-07
28	22	hackathon	cmdb_ci_win_server	after	32	2	6	2026-07-22 14:12:07.716978-07
29	23	hackathon	cmdb_ci_appl	before	6	0	0	2026-07-22 14:12:07.730062-07
30	23	hackathon	cmdb_ci_db_instance	before	9	3	33	2026-07-22 14:12:07.730062-07
31	23	hackathon	cmdb_ci_lb	before	3	0	0	2026-07-22 14:12:07.730062-07
32	23	hackathon	cmdb_ci_linux_server	before	45	10	22	2026-07-22 14:12:07.730062-07
33	23	hackathon	cmdb_ci_netgear	before	12	0	0	2026-07-22 14:12:07.730062-07
34	23	hackathon	cmdb_ci_server	before	6	0	0	2026-07-22 14:12:07.730062-07
35	23	hackathon	cmdb_ci_win_server	before	32	2	6	2026-07-22 14:12:07.730062-07
36	23	hackathon	cmdb_ci_appl	after	6	0	0	2026-07-22 14:12:15.142316-07
37	23	hackathon	cmdb_ci_db_instance	after	9	3	33	2026-07-22 14:12:15.142316-07
38	23	hackathon	cmdb_ci_lb	after	3	0	0	2026-07-22 14:12:15.142316-07
39	23	hackathon	cmdb_ci_linux_server	after	45	10	22	2026-07-22 14:12:15.142316-07
40	23	hackathon	cmdb_ci_netgear	after	12	0	0	2026-07-22 14:12:15.142316-07
41	23	hackathon	cmdb_ci_server	after	6	0	0	2026-07-22 14:12:15.142316-07
42	23	hackathon	cmdb_ci_win_server	after	32	2	6	2026-07-22 14:12:15.142316-07
43	24	hackathon	cmdb_ci_appl	before	6	0	0	2026-07-22 14:12:15.154239-07
44	24	hackathon	cmdb_ci_db_instance	before	9	3	33	2026-07-22 14:12:15.154239-07
45	24	hackathon	cmdb_ci_lb	before	3	0	0	2026-07-22 14:12:15.154239-07
46	24	hackathon	cmdb_ci_linux_server	before	45	10	22	2026-07-22 14:12:15.154239-07
47	24	hackathon	cmdb_ci_netgear	before	12	0	0	2026-07-22 14:12:15.154239-07
48	24	hackathon	cmdb_ci_server	before	6	0	0	2026-07-22 14:12:15.154239-07
49	24	hackathon	cmdb_ci_win_server	before	32	2	6	2026-07-22 14:12:15.154239-07
50	24	hackathon	cmdb_ci_appl	after	6	0	0	2026-07-22 14:12:23.741955-07
51	24	hackathon	cmdb_ci_db_instance	after	9	3	33	2026-07-22 14:12:23.741955-07
52	24	hackathon	cmdb_ci_lb	after	3	0	0	2026-07-22 14:12:23.741955-07
53	24	hackathon	cmdb_ci_linux_server	after	45	10	22	2026-07-22 14:12:23.741955-07
54	24	hackathon	cmdb_ci_netgear	after	12	0	0	2026-07-22 14:12:23.741955-07
55	24	hackathon	cmdb_ci_server	after	6	0	0	2026-07-22 14:12:23.741955-07
56	24	hackathon	cmdb_ci_win_server	after	32	2	6	2026-07-22 14:12:23.741955-07
57	25	hackathon	cmdb_ci_appl	before	6	0	0	2026-07-22 23:25:35.495554-07
58	25	hackathon	cmdb_ci_db_instance	before	9	3	33	2026-07-22 23:25:35.495554-07
59	25	hackathon	cmdb_ci_lb	before	3	0	0	2026-07-22 23:25:35.495554-07
60	25	hackathon	cmdb_ci_linux_server	before	45	10	22	2026-07-22 23:25:35.495554-07
61	25	hackathon	cmdb_ci_netgear	before	12	0	0	2026-07-22 23:25:35.495554-07
62	25	hackathon	cmdb_ci_server	before	6	0	0	2026-07-22 23:25:35.495554-07
63	25	hackathon	cmdb_ci_win_server	before	32	2	6	2026-07-22 23:25:35.495554-07
64	25	hackathon	cmdb_ci_appl	after	6	0	0	2026-07-22 23:26:04.115282-07
65	25	hackathon	cmdb_ci_db_instance	after	9	3	33	2026-07-22 23:26:04.115282-07
66	25	hackathon	cmdb_ci_lb	after	3	0	0	2026-07-22 23:26:04.115282-07
67	25	hackathon	cmdb_ci_linux_server	after	45	10	22	2026-07-22 23:26:04.115282-07
68	25	hackathon	cmdb_ci_netgear	after	12	0	0	2026-07-22 23:26:04.115282-07
69	25	hackathon	cmdb_ci_server	after	6	0	0	2026-07-22 23:26:04.115282-07
70	25	hackathon	cmdb_ci_win_server	after	32	2	6	2026-07-22 23:26:04.115282-07
71	26	hackathon	cmdb_ci_appl	before	6	0	0	2026-07-22 23:26:04.132791-07
72	26	hackathon	cmdb_ci_db_instance	before	9	3	33	2026-07-22 23:26:04.132791-07
73	26	hackathon	cmdb_ci_lb	before	3	0	0	2026-07-22 23:26:04.132791-07
74	26	hackathon	cmdb_ci_linux_server	before	45	10	22	2026-07-22 23:26:04.132791-07
75	26	hackathon	cmdb_ci_netgear	before	12	0	0	2026-07-22 23:26:04.132791-07
76	26	hackathon	cmdb_ci_server	before	6	0	0	2026-07-22 23:26:04.132791-07
77	26	hackathon	cmdb_ci_win_server	before	32	2	6	2026-07-22 23:26:04.132791-07
78	26	hackathon	cmdb_ci_appl	after	6	0	0	2026-07-22 23:26:14.184047-07
79	26	hackathon	cmdb_ci_db_instance	after	9	3	33	2026-07-22 23:26:14.184047-07
80	26	hackathon	cmdb_ci_lb	after	3	0	0	2026-07-22 23:26:14.184047-07
81	26	hackathon	cmdb_ci_linux_server	after	45	10	22	2026-07-22 23:26:14.184047-07
82	26	hackathon	cmdb_ci_netgear	after	12	0	0	2026-07-22 23:26:14.184047-07
83	26	hackathon	cmdb_ci_server	after	6	0	0	2026-07-22 23:26:14.184047-07
84	26	hackathon	cmdb_ci_win_server	after	32	2	6	2026-07-22 23:26:14.184047-07
85	27	hackathon	cmdb_ci_appl	before	6	0	0	2026-07-22 23:26:14.205868-07
86	27	hackathon	cmdb_ci_db_instance	before	9	3	33	2026-07-22 23:26:14.205868-07
87	27	hackathon	cmdb_ci_lb	before	3	0	0	2026-07-22 23:26:14.205868-07
88	27	hackathon	cmdb_ci_linux_server	before	45	10	22	2026-07-22 23:26:14.205868-07
89	27	hackathon	cmdb_ci_netgear	before	12	0	0	2026-07-22 23:26:14.205868-07
90	27	hackathon	cmdb_ci_server	before	6	0	0	2026-07-22 23:26:14.205868-07
91	27	hackathon	cmdb_ci_win_server	before	32	2	6	2026-07-22 23:26:14.205868-07
92	27	hackathon	cmdb_ci_appl	after	6	0	0	2026-07-22 23:26:25.960968-07
93	27	hackathon	cmdb_ci_db_instance	after	9	3	33	2026-07-22 23:26:25.960968-07
94	27	hackathon	cmdb_ci_lb	after	3	0	0	2026-07-22 23:26:25.960968-07
95	27	hackathon	cmdb_ci_linux_server	after	45	10	22	2026-07-22 23:26:25.960968-07
96	27	hackathon	cmdb_ci_netgear	after	12	0	0	2026-07-22 23:26:25.960968-07
97	27	hackathon	cmdb_ci_server	after	6	0	0	2026-07-22 23:26:25.960968-07
98	27	hackathon	cmdb_ci_win_server	after	32	2	6	2026-07-22 23:26:25.960968-07
99	28	hackathon	cmdb_ci_appl	before	6	0	0	2026-07-22 23:26:25.978401-07
100	28	hackathon	cmdb_ci_db_instance	before	9	3	33	2026-07-22 23:26:25.978401-07
101	28	hackathon	cmdb_ci_lb	before	3	0	0	2026-07-22 23:26:25.978401-07
102	28	hackathon	cmdb_ci_linux_server	before	45	10	22	2026-07-22 23:26:25.978401-07
103	28	hackathon	cmdb_ci_netgear	before	12	0	0	2026-07-22 23:26:25.978401-07
104	28	hackathon	cmdb_ci_server	before	6	0	0	2026-07-22 23:26:25.978401-07
105	28	hackathon	cmdb_ci_win_server	before	32	2	6	2026-07-22 23:26:25.978401-07
106	28	hackathon	cmdb_ci_appl	after	6	0	0	2026-07-22 23:26:32.561013-07
107	28	hackathon	cmdb_ci_db_instance	after	9	3	33	2026-07-22 23:26:32.561013-07
108	28	hackathon	cmdb_ci_lb	after	3	0	0	2026-07-22 23:26:32.561013-07
109	28	hackathon	cmdb_ci_linux_server	after	45	10	22	2026-07-22 23:26:32.561013-07
110	28	hackathon	cmdb_ci_netgear	after	12	0	0	2026-07-22 23:26:32.561013-07
111	28	hackathon	cmdb_ci_server	after	6	0	0	2026-07-22 23:26:32.561013-07
112	28	hackathon	cmdb_ci_win_server	after	32	2	6	2026-07-22 23:26:32.561013-07
\.


--
-- Data for Name: decision; Type: TABLE DATA; Schema: public; Owner: ethanrivera
--

COPY public.decision (id, team_tag, entity_type, entity_id, decision, decided_by, note, created_at) FROM stdin;
\.


--
-- Data for Name: dup_cluster; Type: TABLE DATA; Schema: public; Owner: ethanrivera
--

COPY public.dup_cluster (id, team_tag, cluster_key, ci_ids, survivor_id, confidence, rationale, evidence, status, created_at) FROM stdin;
25	hackathon	srv-payments-01	[2, 3, 4]	2	0.8	Records 2, 3, and 4 appear to relate to the same application service for payment processing, identified by similar naming conventions. Record 2 has the best-matched data including the serial number, making it the most authoritative.	{"conflicts": ["serial (2 vs null for 4)", "mac (2 vs 4)"], "matchedOn": ["name", "ip"]}	pending	2026-07-22 23:26:14.181261-07
26	hackathon	srv-hrportal-01	[9, 10, 11]	11	0.85	The servers share similar naming patterns and the most authoritative data is found in record 11, which has a complete serial number. Despite some disparities in naming, their relationships suggest they are the same real-world CI.	{"conflicts": ["serial (11 vs null for 10)", "mac (11 vs null for 10)"], "matchedOn": ["name", "loc"]}	pending	2026-07-22 23:26:14.181261-07
27	hackathon	srv-inventory-01	[16, 17, 18]	18	0.85	These records are closely related based on similar naming patterns and their roles within the inventory application. Record 18, which has the most complete data, is selected as the survivor.	{"conflicts": ["serial (18 vs 17)"], "matchedOn": ["name", "fqdn"]}	pending	2026-07-22 23:26:14.181261-07
28	hackathon	srv-etl-worker-01	[102, 103, 104, 105, 106, 107]	102	0.8	Records 102, 103, 104, and 105 contain similar attributes, and naming conventions suggest they relate to the same service. Record 102 has a defined serial, marking it as the best representative.	{"conflicts": ["lastSeen (signature between 102 vs 103)"], "matchedOn": ["name", "ip"]}	pending	2026-07-22 23:26:14.181261-07
29	hackathon	db-cluster-node-1	[108, 109, 110]	108	0.95	All the records share the same serial number and MAC address, indicating they refer to the same database instance. Record 108 is the most authoritative with complete details.	{"conflicts": [], "matchedOn": ["serial", "mac"]}	pending	2026-07-22 23:26:14.181261-07
30	hackathon	db-cluster-node-2	[111, 112, 113]	112	0.95	The records share a common serial, indicating they are the same database cluster nodes. Record 112 provides the most complete data, making it the survivor.	{"conflicts": [], "matchedOn": ["mac"]}	pending	2026-07-22 23:26:14.181261-07
\.


--
-- Data for Name: finding; Type: TABLE DATA; Schema: public; Owner: ethanrivera
--

COPY public.finding (id, team_tag, ci_id, category, severity, field, message, agent, status, created_at) FROM stdin;
304	hackathon	3	missing_owner	high	owner	Owner is missing from CI 'payments_web_02'.	profiler	open	2026-07-22 23:25:45.095689-07
305	hackathon	4	missing_owner	high	owner	Owner is missing from CI 'paymentsweb3.prod'.	profiler	open	2026-07-22 23:25:45.095689-07
306	hackathon	5	missing_owner	critical	owner	Owner and group are both missing from CI 'Payments Portal - node 1'.	profiler	open	2026-07-22 23:25:45.095689-07
307	hackathon	12	missing_owner	high	group	Owner group is missing from CI 'HR Self-Service - node 1'.	profiler	open	2026-07-22 23:25:45.095689-07
308	hackathon	19	missing_owner	high	owner	Owner is missing from CI 'Inventory API - node 1'.	profiler	open	2026-07-22 23:25:45.095689-07
309	hackathon	25	missing_owner	critical	owner	Owner and group are both missing from CI 'srv_004'.	profiler	open	2026-07-22 23:25:45.095689-07
310	hackathon	3	lifecycle_mismatch	high	lifecycle	Lifecycle state is empty for CI 'payments_web_02', yet it has recent discovery.	profiler	open	2026-07-22 23:25:45.095689-07
311	hackathon	4	lifecycle_mismatch	high	lifecycle	Lifecycle state is empty for CI 'paymentsweb3.prod', yet it has recent discovery.	profiler	open	2026-07-22 23:25:45.095689-07
312	hackathon	11	lifecycle_mismatch	high	lifecycle	Lifecycle is 'installed' for CI 'hrportalweb3.prod', contradicting the discovery date.	profiler	open	2026-07-22 23:25:45.095689-07
313	hackathon	16	lifecycle_mismatch	high	lifecycle	Lifecycle is 'installed' for CI 'INVENTORY-WEB-01', contradicting recent discovery.	profiler	open	2026-07-22 23:25:45.095689-07
314	hackathon	23	lifecycle_mismatch	high	lifecycle	Lifecycle is empty for CI 'SRV-002', contradicting recent discovery.	profiler	open	2026-07-22 23:25:45.095689-07
315	hackathon	24	lifecycle_mismatch	high	lifecycle	Lifecycle is 'operational' for CI 'srv_003', but was last seen a long time ago.	profiler	open	2026-07-22 23:25:45.095689-07
316	hackathon	18	inconsistent_naming	medium	name	CI 'inventoryweb3.prod' does not follow naming conventions.	profiler	open	2026-07-22 23:25:45.095689-07
317	hackathon	11	data_quality	medium	os	Field 'os' has inconsistent casing for CI 'hrportalweb3.prod'.	profiler	open	2026-07-22 23:25:45.095689-07
318	hackathon	4	data_quality	medium	os	Field 'os' has inconsistent casing for CI 'paymentsweb3.prod'.	profiler	open	2026-07-22 23:25:45.095689-07
319	hackathon	25	class_misassignment	medium	class	CI 'srv_004' has a lifecycle of 'in_maintenance' but lacks owners, indicating a class misassignment.	profiler	open	2026-07-22 23:25:45.095689-07
320	hackathon	27	missing_owner	high	owner	Owner is missing while the group is assigned as 'Unix-Ops'.	profiler	open	2026-07-22 23:25:49.463384-07
321	hackathon	28	missing_owner	high	owner	Both owner and group are missing.	profiler	open	2026-07-22 23:25:49.463384-07
322	hackathon	29	lifecycle_mismatch	high	lifecycle	Lifecycle is 'retired' but lastSeen is '2026-07-17', indicating recent use.	profiler	open	2026-07-22 23:25:49.463384-07
323	hackathon	31	missing_owner	high	owner	Both owner and group are missing.	profiler	open	2026-07-22 23:25:49.463384-07
324	hackathon	32	lifecycle_mismatch	high	lifecycle	Lifecycle is empty but lastSeen is '2026-06-25', suggesting operational status.	profiler	open	2026-07-22 23:25:49.463384-07
325	hackathon	34	inconsistent_naming	medium	name	Name 'srv_013' violates naming convention compared to its peers.	profiler	open	2026-07-22 23:25:49.463384-07
326	hackathon	39	missing_identifier	high	serial	No serial number provided for the CI.	profiler	open	2026-07-22 23:25:49.463384-07
327	hackathon	41	missing_owner	high	owner	Both owner and group are missing.	profiler	open	2026-07-22 23:25:49.463384-07
328	hackathon	43	missing_owner	high	owner	Both owner and group are missing.	profiler	open	2026-07-22 23:25:49.463384-07
329	hackathon	47	missing_owner	high	owner	Both owner and group are missing.	profiler	open	2026-07-22 23:25:49.463384-07
330	hackathon	49	missing_identifier	high	serial	No serial number provided for the CI.	profiler	open	2026-07-22 23:25:49.463384-07
331	hackathon	52	missing_owner	high	owner	Owner is missing for CI with name 'SRV-031'.	profiler	open	2026-07-22 23:25:53.739956-07
332	hackathon	53	missing_identifier	critical	serial	No serial and IP for CI with name 'srv-032.corp.example'.	profiler	open	2026-07-22 23:25:53.739956-07
333	hackathon	56	data_quality	medium	model	Model field is empty for CI with name 'srv_035'.	profiler	open	2026-07-22 23:25:53.739956-07
334	hackathon	58	missing_owner	high	owner	Owner is missing for CI with name 'srv-037.corp.example'.	profiler	open	2026-07-22 23:25:53.739956-07
335	hackathon	64	missing_owner	high	owner	Owner is missing for CI with name 'SRV-043'.	profiler	open	2026-07-22 23:25:53.739956-07
336	hackathon	65	missing_owner	high	owner	Owner is missing for CI with name 'SRV-044'.	profiler	open	2026-07-22 23:25:53.739956-07
337	hackathon	67	missing_owner	high	owner	Owner is missing for CI with name 'srv_046'.	profiler	open	2026-07-22 23:25:53.739956-07
338	hackathon	70	missing_owner	high	owner	Owner is missing for CI with name 'SRV-049'.	profiler	open	2026-07-22 23:25:53.739956-07
339	hackathon	73	missing_owner	high	owner	Owner is missing for CI with name 'srv-052.corp.example'.	profiler	open	2026-07-22 23:25:53.739956-07
340	hackathon	74	lifecycle_mismatch	high	lifecycle	Lifecycle is empty while discovered recently for CI with name 'srv_053'.	profiler	open	2026-07-22 23:25:53.739956-07
341	hackathon	76	missing_owner	high	owner	Owner is missing for CI 'srv-055.corp.example'.	profiler	open	2026-07-22 23:25:59.087316-07
342	hackathon	79	missing_owner	high	owner	Owner is missing for CI 'SRV-058'.	profiler	open	2026-07-22 23:25:59.087316-07
343	hackathon	83	missing_owner	high	owner	Owner is missing for CI 'sw-core-2'.	profiler	open	2026-07-22 23:25:59.087316-07
344	hackathon	84	missing_owner	high	owner	Owner is missing for CI 'sw-core-3'.	profiler	open	2026-07-22 23:25:59.087316-07
345	hackathon	85	missing_owner	high	owner	Owner is missing for CI 'sw-core-4'.	profiler	open	2026-07-22 23:25:59.087316-07
346	hackathon	86	missing_owner	high	owner	Owner is missing for CI 'SW_CORE_5'.	profiler	open	2026-07-22 23:25:59.087316-07
347	hackathon	87	missing_owner	high	owner	Owner is missing for CI 'sw-core-6'.	profiler	open	2026-07-22 23:25:59.087316-07
348	hackathon	89	missing_owner	high	owner	Owner is missing for CI 'SW_CORE_8'.	profiler	open	2026-07-22 23:25:59.087316-07
349	hackathon	90	missing_owner	high	owner	Owner is missing for CI 'SW_CORE_9'.	profiler	open	2026-07-22 23:25:59.087316-07
350	hackathon	91	missing_owner	high	owner	Owner is missing for CI 'SW_CORE_10'.	profiler	open	2026-07-22 23:25:59.087316-07
351	hackathon	95	missing_owner	high	owner	Owner is missing for CI 'app-node-10.corp.example'.	profiler	open	2026-07-22 23:25:59.087316-07
352	hackathon	97	missing_owner	high	owner	Owner is missing for CI 'app-node-20.corp.example'.	profiler	open	2026-07-22 23:25:59.087316-07
353	hackathon	99	missing_owner	high	owner	Owner is missing for CI 'app-node-30.corp.example'.	profiler	open	2026-07-22 23:25:59.087316-07
354	hackathon	103	missing_owner	high	owner	Owner and group are both empty.	profiler	open	2026-07-22 23:26:04.113498-07
355	hackathon	105	missing_owner	high	owner	Owner and group are both empty.	profiler	open	2026-07-22 23:26:04.113498-07
356	hackathon	107	missing_owner	high	owner	Owner and group are both empty.	profiler	open	2026-07-22 23:26:04.113498-07
357	hackathon	109	missing_owner	high	owner	Owner is empty.	profiler	open	2026-07-22 23:26:04.113498-07
358	hackathon	110	missing_owner	high	owner	Owner is empty.	profiler	open	2026-07-22 23:26:04.113498-07
359	hackathon	112	missing_owner	high	owner	Owner is empty.	profiler	open	2026-07-22 23:26:04.113498-07
360	hackathon	113	missing_owner	high	owner	Owner is empty.	profiler	open	2026-07-22 23:26:04.113498-07
361	hackathon	103	data_quality	medium	env	Environment value is empty.	profiler	open	2026-07-22 23:26:04.113498-07
362	hackathon	103	data_quality	medium	lifecycle	Lifecycle value is empty.	profiler	open	2026-07-22 23:26:04.113498-07
363	hackathon	105	data_quality	medium	env	Environment value is empty.	profiler	open	2026-07-22 23:26:04.113498-07
364	hackathon	105	data_quality	medium	lifecycle	Lifecycle value is empty.	profiler	open	2026-07-22 23:26:04.113498-07
365	hackathon	107	data_quality	medium	env	Environment value is empty.	profiler	open	2026-07-22 23:26:04.113498-07
366	hackathon	107	data_quality	medium	lifecycle	Lifecycle value is empty.	profiler	open	2026-07-22 23:26:04.113498-07
\.


--
-- Data for Name: ire_rule_proposal; Type: TABLE DATA; Schema: public; Owner: ethanrivera
--

COPY public.ire_rule_proposal (id, team_tag, ci_class, rule_name, criteria, coverage, rationale, status, created_at, sn_sync_status, sn_sync_error, sn_identifier_sys_id, sn_entry_sys_ids) FROM stdin;
22	hackathon	cmdb_ci_lb	Load Balancer Identification Rule	[{"priority": 1, "allowNull": false, "attributes": ["fqdn", "name"]}, {"priority": 2, "allowNull": false, "attributes": ["ip_address"]}, {"priority": 3, "allowNull": true, "attributes": ["model"]}]	[{"pct": 100, "attribute": "serial_number"}, {"pct": 0, "attribute": "mac_address"}, {"pct": 100, "attribute": "ip_address"}, {"pct": 100, "attribute": "fqdn"}, {"pct": 100, "attribute": "name"}, {"pct": 100, "attribute": "url"}, {"pct": 100, "attribute": "port"}, {"pct": 100, "attribute": "model_id"}]	The combination of 'fqdn' (100% coverage) and 'name' (100% coverage) provides a strong identifier for load balancers.	pending	2026-07-22 23:26:25.958021-07	\N	\N	\N	\N
23	hackathon	cmdb_ci_linux_server	Linux Server Identification Rule	[{"priority": 1, "allowNull": false, "attributes": ["name"]}, {"priority": 2, "allowNull": false, "attributes": ["ip_address"]}, {"priority": 3, "allowNull": true, "attributes": ["serial_number"]}]	[{"pct": 80, "attribute": "serial_number"}, {"pct": 73, "attribute": "mac_address"}, {"pct": 87, "attribute": "ip_address"}, {"pct": 16, "attribute": "fqdn"}, {"pct": 100, "attribute": "name"}, {"pct": 0, "attribute": "url"}, {"pct": 20, "attribute": "port"}, {"pct": 73, "attribute": "model_id"}]	The 'name' field has 100% coverage, making it the most reliable identifier for Linux servers, followed by 'ip_address' (87% coverage).	pending	2026-07-22 23:26:25.958021-07	\N	\N	\N	\N
24	hackathon	cmdb_ci_appl	Application Identification Rule	[{"priority": 1, "allowNull": false, "attributes": ["name"]}, {"priority": 2, "allowNull": false, "attributes": ["ip_address"]}, {"priority": 3, "allowNull": true, "attributes": ["url"]}]	[{"pct": 0, "attribute": "serial_number"}, {"pct": 0, "attribute": "mac_address"}, {"pct": 100, "attribute": "ip_address"}, {"pct": 0, "attribute": "fqdn"}, {"pct": 100, "attribute": "name"}, {"pct": 100, "attribute": "url"}, {"pct": 100, "attribute": "port"}, {"pct": 0, "attribute": "model_id"}]	The 'name' field has 100% coverage, making it the strongest identifier for applications, with 'ip_address' providing a fallback due to its 100% coverage.	pending	2026-07-22 23:26:25.958021-07	\N	\N	\N	\N
25	hackathon	cmdb_ci_db_instance	Database Instance Identification Rule	[{"priority": 1, "allowNull": false, "attributes": ["name"]}, {"priority": 2, "allowNull": false, "attributes": ["ip_address"]}, {"priority": 3, "allowNull": true, "attributes": ["serial_number"]}]	[{"pct": 89, "attribute": "serial_number"}, {"pct": 67, "attribute": "mac_address"}, {"pct": 100, "attribute": "ip_address"}, {"pct": 0, "attribute": "fqdn"}, {"pct": 100, "attribute": "name"}, {"pct": 0, "attribute": "url"}, {"pct": 100, "attribute": "port"}, {"pct": 0, "attribute": "model_id"}]	The 'name' field has 100% coverage, ensuring a strong identification method for database instances, while 'ip_address' also has high coverage (100%).	pending	2026-07-22 23:26:25.958021-07	\N	\N	\N	\N
26	hackathon	cmdb_ci_win_server	Windows Server Identification Rule	[{"priority": 1, "allowNull": false, "attributes": ["name"]}, {"priority": 2, "allowNull": false, "attributes": ["ip_address"]}, {"priority": 3, "allowNull": true, "attributes": ["serial_number"]}]	[{"pct": 72, "attribute": "serial_number"}, {"pct": 75, "attribute": "mac_address"}, {"pct": 72, "attribute": "ip_address"}, {"pct": 0, "attribute": "fqdn"}, {"pct": 100, "attribute": "name"}, {"pct": 0, "attribute": "url"}, {"pct": 0, "attribute": "port"}, {"pct": 75, "attribute": "model_id"}]	Identifying Windows servers based on 'name' (100% coverage) and 'ip_address' (72% coverage) ensures a reliable method.	pending	2026-07-22 23:26:25.958021-07	\N	\N	\N	\N
27	hackathon	cmdb_ci_netgear	Netgear Device Identification Rule	[{"priority": 1, "allowNull": false, "attributes": ["name"]}, {"priority": 2, "allowNull": false, "attributes": ["ip_address"]}, {"priority": 3, "allowNull": true, "attributes": ["serial_number"]}]	[{"pct": 83, "attribute": "serial_number"}, {"pct": 100, "attribute": "mac_address"}, {"pct": 100, "attribute": "ip_address"}, {"pct": 0, "attribute": "fqdn"}, {"pct": 100, "attribute": "name"}, {"pct": 0, "attribute": "url"}, {"pct": 0, "attribute": "port"}, {"pct": 100, "attribute": "model_id"}]	The 'name' field is consistently available (100% coverage) for Netgear devices, and 'ip_address' also holds 100%.	pending	2026-07-22 23:26:25.958021-07	\N	\N	\N	\N
28	hackathon	cmdb_ci_server	Generic Server Identification Rule	[{"priority": 1, "allowNull": false, "attributes": ["name"]}, {"priority": 2, "allowNull": false, "attributes": ["ip_address"]}, {"priority": 3, "allowNull": true, "attributes": ["serial_number"]}]	[{"pct": 50, "attribute": "serial_number"}, {"pct": 0, "attribute": "mac_address"}, {"pct": 100, "attribute": "ip_address"}, {"pct": 0, "attribute": "fqdn"}, {"pct": 100, "attribute": "name"}, {"pct": 0, "attribute": "url"}, {"pct": 0, "attribute": "port"}, {"pct": 0, "attribute": "model_id"}]	With 'name' being 100% covered, it serves as the primary identifier for generic servers, followed closely by 'ip_address' at 100% coverage.	pending	2026-07-22 23:26:25.958021-07	\N	\N	\N	\N
\.


--
-- Data for Name: remediation; Type: TABLE DATA; Schema: public; Owner: ethanrivera
--

COPY public.remediation (id, team_tag, action_type, target_ci_id, payload, status, rollback, created_at, applied_at, sn_promotion_status, sn_result) FROM stdin;
\.


--
-- Data for Name: staging_ci; Type: TABLE DATA; Schema: public; Owner: ethanrivera
--

COPY public.staging_ci (id, team_tag, source, ci_class, name, serial_number, mac_address, ip_address, fqdn, port, url, owner, support_group, environment, lifecycle_status, os, model, location, last_discovered, raw, created_at) FROM stdin;
1	hackathon	seed_bundle	cmdb_ci_lb	payments-lb-01	SN77777308	\N	10.10.148.133	payments.corp.example	443	https://payments.corp.example	l.dubois	Net-Ops	production	operational	\N	F5 BIG-IP 4200v	Azure eastus	2026-07-16 22:13:56.165-07	\N	2026-07-18 22:13:56.180987-07
2	hackathon	seed_bundle	cmdb_ci_linux_server	PAYMENTS-WEB-01	SN23664106	39:49:FF:B5:AB:5C	10.10.27.229	\N	8080	\N	l.dubois	Unix-Ops	production		RHEL 9.3	Dell PowerEdge R650	Azure eastus	2026-06-20 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
3	hackathon	seed_bundle	cmdb_ci_linux_server	payments_web_02	SN82451143	56:A6:0E:44:81:C4	10.10.132.1	payments-web-02.payments.corp.example	8080	\N	\N	\N	production		Red Hat Enterprise Linux 9	Dell PowerEdge R650	DC-WEST-2	2026-06-23 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
4	hackathon	seed_bundle	cmdb_ci_linux_server	paymentsweb3.prod	\N	23:D8:4A:04:7D:06	10.10.239.62	payments-web-03.payments.corp.example	8080	\N	\N	Unix-Ops	production		rhel9	Dell PowerEdge R650	Azure eastus	2026-07-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
5	hackathon	seed_bundle	cmdb_ci_appl	Payments Portal - node 1	\N	\N	10.10.69.21	\N	9001	https://payments.corp.example/api	\N	App-Support	production	operational	\N	\N	\N	2026-07-07 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
6	hackathon	seed_bundle	cmdb_ci_appl	Payments Portal - node 2	\N	\N	10.10.57.108	\N	9002	https://payments.corp.example/api	a.okafor	App-Support	production	operational	\N	\N	\N	2026-07-14 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
7	hackathon	seed_bundle	cmdb_ci_db_instance	payments-db-primary	SN48144788	\N	10.10.138.253	\N	5432	\N	j.tanaka	DBA-Team	production	operational	PostgreSQL 16	\N	AWS us-east-1	2026-07-18 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
8	hackathon	seed_bundle	cmdb_ci_lb	hrportal-lb-01	SN71389544	\N	10.20.193.110	hr.corp.example	443	https://hr.corp.example	p.gupta	Net-Ops	production	operational	\N	F5 BIG-IP 4200v	AWS us-east-1	2026-07-15 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
9	hackathon	seed_bundle	cmdb_ci_linux_server	HRPORTAL-WEB-01	SN66582711	\N	10.20.210.152	hrportal-web-01.hr.corp.example	8080	\N	l.dubois	Unix-Ops	production	operational	RHEL 9.3	Dell PowerEdge R650	COLO-NJ	2026-06-28 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
10	hackathon	seed_bundle	cmdb_ci_linux_server	hrportal_web_02	\N	\N	10.20.88.180	hrportal-web-02.hr.corp.example	8080	\N	a.okafor	Unix-Ops	production	operational	Red Hat Enterprise Linux 9	Dell PowerEdge R650	DC-EAST-1	2026-06-20 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
11	hackathon	seed_bundle	cmdb_ci_linux_server	hrportalweb3.prod	SN94198703	9F:86:75:84:3B:38	10.20.85.252	\N	8080	\N	\N	Unix-Ops	production	installed	Red Hat Enterprise Linux 9	Dell PowerEdge R650	DC-WEST-2	2026-07-17 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
12	hackathon	seed_bundle	cmdb_ci_appl	HR Self-Service - node 1	\N	\N	10.20.139.195	\N	9001	https://hr.corp.example/api	s.novak	\N	production	operational	\N	\N	\N	2026-07-05 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
13	hackathon	seed_bundle	cmdb_ci_appl	HR Self-Service - node 2	\N	\N	10.20.44.9	\N	9002	https://hr.corp.example/api	m.reyes	App-Support	production	operational	\N	\N	\N	2026-07-15 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
14	hackathon	seed_bundle	cmdb_ci_db_instance	hrportal-db-primary	SN15059880	\N	10.20.196.67	\N	5432	\N	j.tanaka	DBA-Team	production	operational	PostgreSQL 16	\N	COLO-NJ	2026-07-18 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
15	hackathon	seed_bundle	cmdb_ci_lb	inventory-lb-01	SN80089246	\N	10.30.222.19	inventory.corp.example	443	https://inventory.corp.example	p.gupta	Net-Ops	production	operational	\N	F5 BIG-IP 4200v	DC-WEST-2	2026-07-17 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
16	hackathon	seed_bundle	cmdb_ci_linux_server	INVENTORY-WEB-01	SN59472186	B1:B8:AB:69:4F:9A	10.30.233.100	inventory-web-01.inventory.corp.example	8080	\N	\N	Unix-Ops	production	installed	Red Hat Enterprise Linux 9	Dell PowerEdge R650	COLO-NJ	2026-06-23 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
17	hackathon	seed_bundle	cmdb_ci_linux_server	inventory_web_02	SN87995162	\N	10.30.172.169	inventory-web-02.inventory.corp.example	8080	\N	p.gupta	Unix-Ops	production	operational	RHEL 9.3	Dell PowerEdge R650	DC-EAST-1	2026-07-13 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
18	hackathon	seed_bundle	cmdb_ci_linux_server	inventoryweb3.prod	SN73496658	\N	10.30.190.89	inventory-web-03.inventory.corp.example	8080	\N	p.gupta	Unix-Ops	production		rhel9	Dell PowerEdge R650	AWS us-east-1	2026-07-18 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
19	hackathon	seed_bundle	cmdb_ci_appl	Inventory API - node 1	\N	\N	10.30.12.10	\N	9001	https://inventory.corp.example/api	\N	App-Support	production	operational	\N	\N	\N	2026-07-08 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
20	hackathon	seed_bundle	cmdb_ci_appl	Inventory API - node 2	\N	\N	10.30.175.100	\N	9002	https://inventory.corp.example/api	a.okafor	App-Support	production	operational	\N	\N	\N	2026-07-08 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
21	hackathon	seed_bundle	cmdb_ci_db_instance	inventory-db-primary	SN86717304	\N	10.30.42.163	\N	5432	\N	l.dubois	DBA-Team	production	operational	PostgreSQL 16	\N	Azure eastus	2026-07-17 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
22	hackathon	seed_bundle	cmdb_ci_linux_server	srv_001	\N	11:10:88:4D:58:32	10.41.45.67	\N	\N	\N	j.tanaka	Unix-Ops	dev	operational	Ubuntu 20.04	Lenovo SR630	COLO-NJ	2026-06-10 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
23	hackathon	seed_bundle	cmdb_ci_linux_server	SRV-002	SN91436299	F9:41:A9:6E:F1:D2	\N	\N	\N	\N	a.okafor	\N	production		RHEL 8.9	Lenovo SR630	AWS us-east-1	2026-06-23 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
24	hackathon	seed_bundle	cmdb_ci_win_server	srv_003	\N	E9:F5:23:EF:2E:FB	10.43.218.101	\N	\N	\N	a.okafor	Windows-Ops	PROD	operational	Win2019	HPE ProLiant DL380	AWS us-east-1	2025-12-14 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
25	hackathon	seed_bundle	cmdb_ci_linux_server	srv_004	SN27839007	47:3F:D8:2F:40:F7	10.44.99.220	\N	\N	\N	\N	\N	staging	in_maintenance	RHEL 8.9		AWS us-east-1	2026-06-12 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
26	hackathon	seed_bundle	cmdb_ci_win_server	SRV-005	SN98147154	\N	10.40.206.11	\N	\N	\N	m.reyes	\N	staging	in_maintenance	Microsoft Windows Server 2019		\N	2025-03-13 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
27	hackathon	seed_bundle	cmdb_ci_linux_server	srv-006.corp.example	SN38139156	\N	10.41.224.4	\N	\N	\N	\N	Unix-Ops	PROD	installed	Ubuntu 20.04	HPE ProLiant DL380	DC-EAST-1	2026-06-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
28	hackathon	seed_bundle	cmdb_ci_win_server	SRV-007	SN47335976	DF:4B:15:EB:F6:D5	10.42.24.93	\N	\N	\N	\N	\N		operational	Windows Server 2022	HPE ProLiant DL380	DC-EAST-1	2026-06-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
29	hackathon	seed_bundle	cmdb_ci_linux_server	srv_008	\N	\N	10.43.74.110	\N	\N	\N	\N	\N		retired	Ubuntu 20.04	Lenovo SR630	COLO-NJ	2026-07-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
30	hackathon	seed_bundle	cmdb_ci_win_server	SRV-009	SN23494172	5A:4C:3C:18:30:D7	10.44.58.238	\N	\N	\N	l.dubois	\N		retired	Windows Server 2022		\N	2026-07-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
31	hackathon	seed_bundle	cmdb_ci_linux_server	srv_010	\N	46:2E:46:29:EB:ED	10.40.138.7	\N	\N	\N	\N	\N		in_maintenance	RHEL 8.9	Dell PowerEdge R650	\N	2026-06-15 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
32	hackathon	seed_bundle	cmdb_ci_win_server	SRV-011	SN91153699	DC:C1:C6:D1:87:7B	10.41.180.166	\N	\N	\N	\N	\N	PROD		Windows Server 2022	Lenovo SR630	\N	2026-06-24 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
33	hackathon	seed_bundle	cmdb_ci_linux_server	SRV-012	SN67920984	33:D9:6A:F7:9D:38	10.42.65.126	\N	\N	\N	a.okafor	Unix-Ops	production		Ubuntu 20.04	Lenovo SR630	COLO-NJ	2025-04-06 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
34	hackathon	seed_bundle	cmdb_ci_win_server	srv_013	SN59985690	92:96:CC:58:9E:B9	10.43.94.73	\N	\N	\N	j.tanaka	Windows-Ops	dev	operational	Win2019	Dell PowerEdge R650	DC-EAST-1	2025-04-02 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
35	hackathon	seed_bundle	cmdb_ci_linux_server	srv_014	SN34896736	C9:54:80:E7:67:83	10.44.151.189	\N	\N	\N	m.reyes	\N	production	retired	SLES 15	HPE ProLiant DL380	COLO-NJ	2026-07-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
36	hackathon	seed_bundle	cmdb_ci_win_server	srv_015	SN90239409	\N	\N	\N	\N	\N	m.reyes	\N	PROD	operational	Windows Server 2022	Lenovo SR630	DC-EAST-1	2026-06-20 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
37	hackathon	seed_bundle	cmdb_ci_win_server	SRV-016	\N	\N	\N	\N	\N	\N	m.reyes	Windows-Ops		installed	Windows Server 2022		DC-WEST-2	2025-04-07 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
38	hackathon	seed_bundle	cmdb_ci_linux_server	SRV-017	SN49479273	B5:7C:E7:C2:42:98	10.42.234.118	\N	\N	\N	j.tanaka	\N	PROD	operational	SLES 15	HPE ProLiant DL380	COLO-NJ	2026-07-03 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
39	hackathon	seed_bundle	cmdb_ci_linux_server	srv-018.corp.example	SN79420968	9D:B7:23:C0:E2:2A	10.43.28.105	\N	\N	\N	\N	Unix-Ops	PROD	operational	RHEL 8.9	Dell PowerEdge R650	AWS us-east-1	2025-06-28 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
40	hackathon	seed_bundle	cmdb_ci_win_server	srv-019.corp.example	\N	\N	10.44.52.104	\N	\N	\N	a.okafor	Windows-Ops	PROD	retired	Windows Server 2022	Dell PowerEdge R650	\N	2026-07-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
41	hackathon	seed_bundle	cmdb_ci_linux_server	srv_020	\N	\N	10.40.76.203	\N	\N	\N	\N	\N		installed	Ubuntu 20.04	HPE ProLiant DL380	Azure eastus	2026-06-12 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
42	hackathon	seed_bundle	cmdb_ci_win_server	srv-021.corp.example	SN25877057	85:DC:B3:81:2F:03	\N	\N	\N	\N	a.okafor	\N	dev	operational	Win2019		DC-EAST-1	2025-12-02 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
43	hackathon	seed_bundle	cmdb_ci_win_server	srv_022	SN54438613	\N	10.42.29.201	\N	\N	\N	\N	Windows-Ops	staging	operational	Microsoft Windows Server 2019	Lenovo SR630	COLO-NJ	2026-06-29 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
44	hackathon	seed_bundle	cmdb_ci_win_server	srv_023	SN88806766	\N	\N	\N	\N	\N	p.gupta	\N	dev	operational	Win2019		Azure eastus	2026-06-29 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
45	hackathon	seed_bundle	cmdb_ci_win_server	SRV-024	SN78908945	0A:4C:38:42:64:23	\N	\N	\N	\N	a.okafor	Windows-Ops	production	installed	Windows Server 2022	HPE ProLiant DL380	DC-WEST-2	2026-06-05 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
46	hackathon	seed_bundle	cmdb_ci_linux_server	srv-025.corp.example	SN28573980	18:75:28:F1:1D:9C	10.40.76.64	\N	\N	\N	m.reyes	\N		operational	RHEL 8.9		AWS us-east-1	2026-06-30 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
47	hackathon	seed_bundle	cmdb_ci_win_server	srv_026	\N	16:CA:DC:18:87:15	10.41.208.54	\N	\N	\N	\N	\N	staging	operational	Windows Server 2022	Dell PowerEdge R650	DC-EAST-1	2026-06-13 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
48	hackathon	seed_bundle	cmdb_ci_linux_server	srv_027	\N	\N	10.42.196.72	\N	\N	\N	p.gupta	Unix-Ops	PROD	in_maintenance	RHEL 8.9	Dell PowerEdge R650	AWS us-east-1	2025-12-10 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
49	hackathon	seed_bundle	cmdb_ci_linux_server	srv_028	SN50227631	45:97:4D:6E:7C:87	\N	\N	\N	\N	s.novak	Unix-Ops	dev	operational	RHEL 8.9	Lenovo SR630	DC-WEST-2	2025-07-19 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
50	hackathon	seed_bundle	cmdb_ci_win_server	srv_029	\N	B7:DD:00:22:17:A6	\N	\N	\N	\N	\N	\N	dev	in_maintenance	Microsoft Windows Server 2019	Lenovo SR630	DC-WEST-2	2026-07-13 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
51	hackathon	seed_bundle	cmdb_ci_linux_server	srv-030.corp.example	SN25544852	1E:D8:EA:7B:FD:7C	10.40.204.250	\N	\N	\N	p.gupta	Unix-Ops	dev	operational	SLES 15	Dell PowerEdge R650	Azure eastus	2025-07-23 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
52	hackathon	seed_bundle	cmdb_ci_win_server	SRV-031	SN32475624	68:C1:6E:6B:8F:C8	10.41.240.151	\N	\N	\N	\N	Windows-Ops			Windows Server 2022	HPE ProLiant DL380	Azure eastus	2026-07-17 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
53	hackathon	seed_bundle	cmdb_ci_win_server	srv-032.corp.example	\N	81:CC:77:B1:6D:0B	\N	\N	\N	\N	\N	Windows-Ops	staging	in_maintenance	Windows Server 2022	Dell PowerEdge R650	Azure eastus	2026-06-28 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
54	hackathon	seed_bundle	cmdb_ci_linux_server	srv-033.corp.example	SN31745862	\N	10.43.71.80	\N	\N	\N	p.gupta	\N	staging	operational	SLES 15	Dell PowerEdge R650	DC-WEST-2	2026-07-01 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
55	hackathon	seed_bundle	cmdb_ci_linux_server	srv_034	SN98192384	68:C1:FF:AA:DD:A2	10.44.18.117	\N	\N	\N	a.okafor	Unix-Ops	staging	retired	RHEL 8.9	Lenovo SR630	DC-WEST-2	2026-07-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
56	hackathon	seed_bundle	cmdb_ci_linux_server	srv_035	SN50512728	F1:D1:F4:DC:2B:BC	\N	\N	\N	\N	p.gupta	Unix-Ops	production	in_maintenance	RHEL 8.9		\N	2026-06-04 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
57	hackathon	seed_bundle	cmdb_ci_linux_server	SRV-036	SN26901510	F1:06:04:69:7E:88	10.41.183.114	\N	\N	\N	a.okafor	\N			RHEL 8.9	Lenovo SR630	DC-WEST-2	2026-07-13 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
58	hackathon	seed_bundle	cmdb_ci_win_server	srv-037.corp.example	SN36494283	F8:E0:75:C3:96:2C	10.42.38.161	\N	\N	\N	\N	Windows-Ops	staging	operational	Microsoft Windows Server 2019	Dell PowerEdge R650	COLO-NJ	2026-07-07 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
59	hackathon	seed_bundle	cmdb_ci_win_server	srv-038.corp.example	SN63399246	D2:D1:A8:33:0E:18	10.43.236.162	\N	\N	\N	m.reyes	Windows-Ops	dev	operational	Win2019	Lenovo SR630	\N	2026-06-04 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
60	hackathon	seed_bundle	cmdb_ci_linux_server	srv-039.corp.example	SN20723023	\N	10.44.213.71	\N	\N	\N	p.gupta	Unix-Ops	production	operational	RHEL 8.9		COLO-NJ	2026-07-08 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
61	hackathon	seed_bundle	cmdb_ci_win_server	srv_040	SN29626002	A5:B2:39:9F:4D:BF	10.40.59.79	\N	\N	\N	m.reyes	Windows-Ops	production	operational	Microsoft Windows Server 2019	Lenovo SR630	\N	2025-04-17 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
62	hackathon	seed_bundle	cmdb_ci_win_server	srv_041	SN26198557	72:53:B2:51:29:20	10.41.171.115	\N	\N	\N	j.tanaka	\N	PROD	operational	Microsoft Windows Server 2019		AWS us-east-1	2025-05-22 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
63	hackathon	seed_bundle	cmdb_ci_linux_server	srv_042	SN85948958	\N	10.42.98.2	\N	\N	\N	a.okafor	Unix-Ops	dev	operational	RHEL 8.9	Lenovo SR630	\N	2026-06-24 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
64	hackathon	seed_bundle	cmdb_ci_linux_server	SRV-043	SN53168180	07:40:58:58:A0:0C	\N	\N	\N	\N	\N	Unix-Ops	dev	retired	Ubuntu 20.04	Lenovo SR630	DC-WEST-2	2026-07-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
65	hackathon	seed_bundle	cmdb_ci_linux_server	SRV-044	\N	C6:45:8D:9A:10:DD	\N	\N	\N	\N	\N	Unix-Ops	PROD	operational	SLES 15	Dell PowerEdge R650	\N	2026-07-09 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
66	hackathon	seed_bundle	cmdb_ci_win_server	srv_045	SN72236679	E3:D0:1B:4C:C5:C6	10.40.57.137	\N	\N	\N	p.gupta	Windows-Ops	PROD	retired	Windows Server 2022	HPE ProLiant DL380	\N	2026-07-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
67	hackathon	seed_bundle	cmdb_ci_win_server	srv_046	\N	48:6D:35:DB:3C:D5	10.41.208.254	\N	\N	\N	\N	Windows-Ops		operational	Windows Server 2022		DC-EAST-1	2026-07-01 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
68	hackathon	seed_bundle	cmdb_ci_win_server	srv-047.corp.example	\N	\N	10.42.89.147	\N	\N	\N	l.dubois	Windows-Ops	PROD	installed	Windows Server 2022	Lenovo SR630	\N	2026-07-05 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
69	hackathon	seed_bundle	cmdb_ci_linux_server	SRV-048	SN15859084	59:47:C5:1C:01:B2	10.43.140.89	\N	\N	\N	l.dubois	Unix-Ops		installed	Ubuntu 20.04	Lenovo SR630	DC-WEST-2	2026-06-17 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
70	hackathon	seed_bundle	cmdb_ci_win_server	SRV-049	SN50017882	2D:35:F9:4D:39:B3	10.44.204.66	\N	\N	\N	\N	\N	dev		Win2019	Lenovo SR630	DC-WEST-2	2026-06-11 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
71	hackathon	seed_bundle	cmdb_ci_win_server	srv-050.corp.example	SN20964441	14:EE:98:23:8E:4F	\N	\N	\N	\N	l.dubois	Windows-Ops		installed	Windows Server 2022	Dell PowerEdge R650	\N	2026-06-27 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
72	hackathon	seed_bundle	cmdb_ci_win_server	srv-051.corp.example	SN19097291	06:8E:EE:63:AA:51	10.41.174.230	\N	\N	\N	m.reyes	\N	production	retired	Win2019	HPE ProLiant DL380	Azure eastus	2026-07-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
73	hackathon	seed_bundle	cmdb_ci_linux_server	srv-052.corp.example	SN40535471	\N	10.42.184.227	\N	\N	\N	\N	Unix-Ops		operational	Ubuntu 20.04	Dell PowerEdge R650	COLO-NJ	2026-07-17 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
74	hackathon	seed_bundle	cmdb_ci_linux_server	srv_053	\N	BA:C8:27:44:BF:86	10.43.22.61	\N	\N	\N	j.tanaka	\N	production		RHEL 8.9	Dell PowerEdge R650	AWS us-east-1	2026-06-25 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
75	hackathon	seed_bundle	cmdb_ci_linux_server	SRV-054	SN83617582	66:BE:77:64:3B:DB	10.44.49.243	\N	\N	\N	m.reyes	Unix-Ops	dev	retired	Ubuntu 20.04	Dell PowerEdge R650	AWS us-east-1	2026-07-16 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
76	hackathon	seed_bundle	cmdb_ci_win_server	srv-055.corp.example	\N	\N	\N	\N	\N	\N	\N	Windows-Ops	staging	operational	Windows Server 2022	Lenovo SR630	DC-WEST-2	2026-06-06 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
77	hackathon	seed_bundle	cmdb_ci_win_server	SRV-056	SN78229831	3C:6E:5A:91:CC:2D	10.41.157.39	\N	\N	\N	s.novak	Windows-Ops		operational	Win2019	HPE ProLiant DL380	\N	2026-07-13 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
78	hackathon	seed_bundle	cmdb_ci_win_server	SRV-057	SN97824387	D2:55:ED:EF:93:0D	10.42.217.179	\N	\N	\N	a.okafor	Windows-Ops	PROD	installed	Win2019	Dell PowerEdge R650	DC-EAST-1	2026-07-03 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
79	hackathon	seed_bundle	cmdb_ci_win_server	SRV-058	SN58777400	5A:7F:BD:C4:09:EF	10.43.60.7	\N	\N	\N	\N	Windows-Ops	PROD	in_maintenance	Win2019		\N	2026-07-07 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
80	hackathon	seed_bundle	cmdb_ci_linux_server	srv-059.corp.example	SN50401226	C2:7A:3F:4E:69:BA	\N	\N	\N	\N	m.reyes	Unix-Ops		in_maintenance	SLES 15	Dell PowerEdge R650	Azure eastus	2026-06-29 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
81	hackathon	seed_bundle	cmdb_ci_win_server	srv-060.corp.example	SN53724204	AF:DF:06:C0:9A:09	10.40.19.7	\N	\N	\N	a.okafor	Windows-Ops	production		Microsoft Windows Server 2019	Dell PowerEdge R650	\N	2026-07-14 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
82	hackathon	seed_bundle	cmdb_ci_netgear	SW_CORE_1	SN87098639	79:A9:08:ED:26:03	10.1.181.91	\N	\N	\N	j.tanaka	\N	production	installed	\N	Arista 7050X	DC-EAST-1	2026-07-04 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
83	hackathon	seed_bundle	cmdb_ci_netgear	sw-core-2	SN88593573	B9:5B:D2:2E:88:21	10.1.228.214	\N	\N	\N	\N	Net-Ops	production	installed	\N	Cisco Catalyst 9300	Azure eastus	2026-06-18 22:13:56.166-07	\N	2026-07-18 22:13:56.180987-07
84	hackathon	seed_bundle	cmdb_ci_netgear	sw-core-3	SN95831675	07:C4:02:DB:4B:CD	10.1.215.23	\N	\N	\N	\N	Net-Ops	production		\N	Arista 7050X	AWS us-east-1	2026-07-11 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
85	hackathon	seed_bundle	cmdb_ci_netgear	sw-core-4	SN52101132	5E:7F:E6:62:94:C8	10.1.219.249	\N	\N	\N	\N	Net-Ops	production	operational	\N	Cisco Catalyst 9300	DC-WEST-2	2026-06-17 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
86	hackathon	seed_bundle	cmdb_ci_netgear	SW_CORE_5	SN22979617	FB:64:0C:75:23:8A	10.1.65.88	\N	\N	\N	\N	Net-Ops	production		\N	Arista 7050X	AWS us-east-1	2026-06-30 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
87	hackathon	seed_bundle	cmdb_ci_netgear	sw-core-6	\N	A5:5E:E6:63:5E:99	10.1.174.203	\N	\N	\N	\N	Net-Ops	production	installed	\N	Juniper EX4400	AWS us-east-1	2026-06-11 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
88	hackathon	seed_bundle	cmdb_ci_netgear	SW_CORE_7	SN14535154	B0:E5:F7:B7:B6:38	10.1.32.56	\N	\N	\N	l.dubois	\N	production		\N	Cisco Catalyst 9300	DC-EAST-1	2026-05-24 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
89	hackathon	seed_bundle	cmdb_ci_netgear	SW_CORE_8	\N	EE:EA:1C:B3:CD:45	10.1.74.31	\N	\N	\N	\N	\N	production	installed	\N	Arista 7050X	COLO-NJ	2026-05-25 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
90	hackathon	seed_bundle	cmdb_ci_netgear	SW_CORE_9	SN81895840	39:A8:F8:B7:B9:AD	10.1.36.159	\N	\N	\N	\N	\N	production	installed	\N	Cisco Catalyst 9300	COLO-NJ	2026-05-21 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
91	hackathon	seed_bundle	cmdb_ci_netgear	SW_CORE_10	SN81792349	8C:4C:34:41:C2:4D	10.1.49.242	\N	\N	\N	\N	\N	production	operational	\N	Arista 7050X	Azure eastus	2026-07-17 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
92	hackathon	seed_bundle	cmdb_ci_netgear	SW_CORE_11	SN10854573	0A:E9:FA:86:13:1B	10.1.90.242	\N	\N	\N	a.okafor	Net-Ops	production	installed	\N	Cisco Catalyst 9300	AWS us-east-1	2026-07-11 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
93	hackathon	seed_bundle	cmdb_ci_netgear	SW_CORE_12	SN59400464	7D:E7:63:32:85:8C	10.1.161.34	\N	\N	\N	s.novak	Net-Ops	production	operational	\N	Arista 7050X	DC-WEST-2	2026-07-13 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
95	hackathon	discovery_import	cmdb_ci_linux_server	app-node-10.corp.example	SN19168198	B8:94:22:96:33:41	10.50.176.174	\N	\N	\N	\N	\N	PROD	installed	Red Hat Enterprise Linux 9	\N	\N	2026-06-08 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
96	hackathon	seed_bundle	cmdb_ci_linux_server	APP-NODE-20	SN79950069	F2:2E:61:F8:1C:83	10.50.82.35	\N	\N	\N	a.okafor	Unix-Ops	production	operational	RHEL 9.3	\N	DC-EAST-1	2026-07-15 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
98	hackathon	seed_bundle	cmdb_ci_linux_server	APP-NODE-30	SN90554678	F5:27:0D:60:14:D0	10.50.152.141	\N	\N	\N	m.reyes	Unix-Ops	production	operational	RHEL 9.3	\N	DC-EAST-1	2026-07-15 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
99	hackathon	discovery_import	cmdb_ci_linux_server	app-node-30.corp.example	SN90554678	F5:27:0D:60:14:D0	10.50.152.141	\N	\N	\N	\N	\N	PROD	installed	Red Hat Enterprise Linux 9	\N	\N	2026-06-08 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
100	hackathon	seed_bundle	cmdb_ci_linux_server	APP-NODE-40	SN33473920	CB:DF:7C:9D:36:D9	10.50.162.190	\N	\N	\N	l.dubois	Unix-Ops	production	operational	RHEL 9.3	\N	DC-EAST-1	2026-07-15 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
101	hackathon	discovery_import	cmdb_ci_linux_server	app-node-40.corp.example	SN33473920	CB:DF:7C:9D:36:D9	10.50.162.190	\N	\N	\N	\N	\N	PROD	installed	Red Hat Enterprise Linux 9	\N	\N	2026-06-08 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
102	hackathon	seed_bundle	cmdb_ci_server	etl-worker-01	SN75463227	\N	10.60.210.179	\N	\N	\N	a.okafor	App-Support	production	operational	\N	\N	\N	2026-07-13 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
103	hackathon	spreadsheet_import	cmdb_ci_server	ETL-WORKER-01	\N	\N	10.60.210.179	\N	\N	\N	\N	\N			\N	\N	\N	2026-03-20 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
104	hackathon	seed_bundle	cmdb_ci_server	etl-worker-02	SN44377265	\N	10.60.7.27	\N	\N	\N	m.reyes	App-Support	production	operational	\N	\N	\N	2026-07-13 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
105	hackathon	spreadsheet_import	cmdb_ci_server	ETL-WORKER-02	\N	\N	10.60.7.27	\N	\N	\N	\N	\N			\N	\N	\N	2026-03-20 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
106	hackathon	seed_bundle	cmdb_ci_server	etl-worker-03	SN27967935	\N	10.60.109.140	\N	\N	\N	l.dubois	App-Support	production	operational	\N	\N	\N	2026-07-13 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
107	hackathon	spreadsheet_import	cmdb_ci_server	ETL-WORKER-03	\N	\N	10.60.109.140	\N	\N	\N	\N	\N			\N	\N	\N	2026-03-20 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
108	hackathon	seed_bundle	cmdb_ci_db_instance	DB-CLUSTER-NODE-1	SN77823581	EC:CE:BD:CF:BB:50	10.70.230.241	\N	5432	\N	p.gupta	\N	production	installed	PostgreSQL 15	\N	\N	2026-07-12 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
109	hackathon	discovery_import	cmdb_ci_db_instance	db-cluster-node-1	SN77823581	EC:CE:BD:CF:BB:50	10.70.23.69	\N	5432	\N	\N	\N	production	operational	PostgreSQL 15	\N	\N	2026-07-14 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
110	hackathon	agent_import	cmdb_ci_db_instance	dbclusternode1.corp.example	SN77823581	EC:CE:BD:CF:BB:50	10.70.213.238	\N	5432	\N	\N	\N	production	operational	PostgreSQL 15	\N	\N	2026-07-11 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
111	hackathon	seed_bundle	cmdb_ci_db_instance	DB-CLUSTER-NODE-2	\N	6F:28:46:46:DD:D7	10.70.248.72	\N	5432	\N	s.novak	\N	production	installed	PostgreSQL 15	\N	\N	2026-07-13 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
112	hackathon	discovery_import	cmdb_ci_db_instance	db-cluster-node-2	SN30965830	6F:28:46:46:DD:D7	10.70.7.158	\N	5432	\N	\N	DBA-Team	production	installed	PostgreSQL 15	\N	\N	2026-07-12 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
113	hackathon	agent_import	cmdb_ci_db_instance	dbclusternode2.corp.example	SN30965830	6F:28:46:46:DD:D7	10.70.172.83	\N	5432	\N	\N	DBA-Team	production	operational	PostgreSQL 15	\N	\N	2026-07-14 22:13:56.167-07	\N	2026-07-18 22:13:56.180987-07
97	hackathon	discovery_import	cmdb_ci_linux_server	app-node-20.corp.example	SN79950069	F2:2E:61:F8:1C:83	10.50.82.35	\N	\N	\N	\N	\N	PROD	installed	Red Hat Enterprise Linux 9	\N	\N	2026-06-08 22:13:56.167-07	\N	2026-07-18 22:13:56.18-07
94	hackathon	seed_bundle	cmdb_ci_linux_server	APP-NODE-10	SN19168198	B8:94:22:96:33:41	10.50.176.174	\N	\N	\N	j.tanaka	Unix-Ops	production	operational	RHEL 9.3	\N	DC-EAST-1	2026-07-15 22:13:56.167-07	\N	2026-07-18 22:13:56.18-07
\.


--
-- Data for Name: topology_proposal; Type: TABLE DATA; Schema: public; Owner: ethanrivera
--

COPY public.topology_proposal (id, team_tag, service_name, member_ci_ids, relationships, endpoints, rationale, confidence, status, created_at) FROM stdin;
10	hackathon	Payments Service	[1, 2, 3, 4, 5, 6, 7]	[{"type": "load_balances", "child": 2, "parent": 1}, {"type": "load_balances", "child": 3, "parent": 1}, {"type": "load_balances", "child": 4, "parent": 1}, {"type": "depends_on", "child": 7, "parent": 5}, {"type": "depends_on", "child": 7, "parent": 6}]	[{"url": "https://payments.corp.example/api", "port": 9001}, {"url": "https://payments.corp.example/api", "port": 9002}, {"url": "https://payments.corp.example", "port": 443}]	The service name 'Payments' appears consistently across CI names including load balancers, web servers, and application nodes. The load balancer's URL points to the application endpoints.	0.85	pending	2026-07-22 23:26:32.559421-07
11	hackathon	HR Portal Service	[8, 9, 10, 12, 13, 14]	[{"type": "load_balances", "child": 9, "parent": 8}, {"type": "load_balances", "child": 10, "parent": 8}, {"type": "depends_on", "child": 14, "parent": 12}, {"type": "depends_on", "child": 14, "parent": 13}]	[{"url": "https://hr.corp.example/api", "port": 9001}, {"url": "https://hr.corp.example/api", "port": 9002}, {"url": "https://hr.corp.example", "port": 443}]	Consistent naming conventions with 'HR Portal' along with URLs for the load balancer and application nodes confirm the service integrity.	0.85	pending	2026-07-22 23:26:32.559421-07
12	hackathon	Inventory Service	[15, 16, 17, 19, 20, 21]	[{"type": "load_balances", "child": 16, "parent": 15}, {"type": "load_balances", "child": 17, "parent": 15}, {"type": "depends_on", "child": 21, "parent": 19}, {"type": "depends_on", "child": 21, "parent": 20}]	[{"url": "https://inventory.corp.example/api", "port": 9001}, {"url": "https://inventory.corp.example/api", "port": 9002}, {"url": "https://inventory.corp.example", "port": 443}]	Shared naming convention with entities associated with 'Inventory', paired with confirmed application and database endpoints.	0.85	pending	2026-07-22 23:26:32.559421-07
\.


--
-- Name: agent_run_completeness_snapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ethanrivera
--

SELECT pg_catalog.setval('public.agent_run_completeness_snapshot_id_seq', 112, true);


--
-- Name: agent_run_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ethanrivera
--

SELECT pg_catalog.setval('public.agent_run_id_seq', 28, true);


--
-- Name: decision_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ethanrivera
--

SELECT pg_catalog.setval('public.decision_id_seq', 20, true);


--
-- Name: dup_cluster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ethanrivera
--

SELECT pg_catalog.setval('public.dup_cluster_id_seq', 30, true);


--
-- Name: finding_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ethanrivera
--

SELECT pg_catalog.setval('public.finding_id_seq', 366, true);


--
-- Name: ire_rule_proposal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ethanrivera
--

SELECT pg_catalog.setval('public.ire_rule_proposal_id_seq', 28, true);


--
-- Name: remediation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ethanrivera
--

SELECT pg_catalog.setval('public.remediation_id_seq', 11, true);


--
-- Name: staging_ci_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ethanrivera
--

SELECT pg_catalog.setval('public.staging_ci_id_seq', 113, true);


--
-- Name: topology_proposal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ethanrivera
--

SELECT pg_catalog.setval('public.topology_proposal_id_seq', 12, true);


--
-- Name: agent_run_completeness_snapshot agent_run_completeness_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.agent_run_completeness_snapshot
    ADD CONSTRAINT agent_run_completeness_snapshot_pkey PRIMARY KEY (id);


--
-- Name: agent_run agent_run_pkey; Type: CONSTRAINT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.agent_run
    ADD CONSTRAINT agent_run_pkey PRIMARY KEY (id);


--
-- Name: decision decision_pkey; Type: CONSTRAINT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.decision
    ADD CONSTRAINT decision_pkey PRIMARY KEY (id);


--
-- Name: dup_cluster dup_cluster_pkey; Type: CONSTRAINT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.dup_cluster
    ADD CONSTRAINT dup_cluster_pkey PRIMARY KEY (id);


--
-- Name: finding finding_pkey; Type: CONSTRAINT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.finding
    ADD CONSTRAINT finding_pkey PRIMARY KEY (id);


--
-- Name: ire_rule_proposal ire_rule_proposal_pkey; Type: CONSTRAINT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.ire_rule_proposal
    ADD CONSTRAINT ire_rule_proposal_pkey PRIMARY KEY (id);


--
-- Name: remediation remediation_pkey; Type: CONSTRAINT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.remediation
    ADD CONSTRAINT remediation_pkey PRIMARY KEY (id);


--
-- Name: staging_ci staging_ci_pkey; Type: CONSTRAINT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.staging_ci
    ADD CONSTRAINT staging_ci_pkey PRIMARY KEY (id);


--
-- Name: topology_proposal topology_proposal_pkey; Type: CONSTRAINT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.topology_proposal
    ADD CONSTRAINT topology_proposal_pkey PRIMARY KEY (id);


--
-- Name: agent_run_completeness_snapshot_run_class_phase_uidx; Type: INDEX; Schema: public; Owner: ethanrivera
--

CREATE UNIQUE INDEX agent_run_completeness_snapshot_run_class_phase_uidx ON public.agent_run_completeness_snapshot USING btree (agent_run_id, ci_class, phase);


--
-- Name: agent_run_completeness_snapshot agent_run_completeness_snapshot_agent_run_id_agent_run_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: ethanrivera
--

ALTER TABLE ONLY public.agent_run_completeness_snapshot
    ADD CONSTRAINT agent_run_completeness_snapshot_agent_run_id_agent_run_id_fk FOREIGN KEY (agent_run_id) REFERENCES public.agent_run(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: ethanrivera
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict Dhu8Slqf8JgtGfh6EiEgd9zsz2FMqKBJZ9ZOpFhMoesoLnkbWeOsjIkZ5rX3ykV

