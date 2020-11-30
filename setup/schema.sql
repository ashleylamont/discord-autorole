create table  if not exists gamesplayed
(
    userid   text not null,
    gamename text not null,
    constraint gamesplayed_pk
        primary key (userid, gamename)
);

create table if not exists rolebindings
(
    rolebinding        serial                not null
        constraint rolebindings_pk
            primary key,
    serverid           text                  not null,
    roleid             text                  not null,
    gamename           text                  not null,
    sendmessages       boolean default true  not null,
    removewheninactive boolean default false not null
);

create table if not exists serverconfig
(
    serverid       text                       not null
        constraint serverlocales_pk
            primary key,
    language       text    default 'en'::text not null,
    gamesservices  boolean default false,
    unknownmessage boolean default true,
    givetonoroles  boolean default true       not null
);

create or replace view gamefrequency(gamename, count) as
    SELECT gamesplayed.gamename,
        count(*) AS count
    FROM gamesplayed
    GROUP BY gamesplayed.gamename
    ORDER BY (count(*)) DESC;

create extension pg_trgm
    schema public
    version '1.4';

comment on extension pg_trgm is 'text similarity measurement and index searching based on trigrams';
